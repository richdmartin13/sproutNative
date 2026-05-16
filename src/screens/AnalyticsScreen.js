import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Sigma, ChevronLeft, ChevronRight } from '../components/Icon.js';
import SpiderChart from '../components/SpiderChart.js';
import GlassCard from '../components/GlassCard.js';
import { useApp } from '../context/AppContext.js';
import { todayStr, fmtDateLong, shiftDate } from '../lib/util.js';
import {
  totalCountFor, tagFrequency, dayOfWeekBuckets, trendsFor,
  moodCounts, energyCounts, hourlyBucketsFor, tagFrequencyForHabit,
  coOccurrenceFor, resistRate, easeAvgs, timeOfDayBuckets,
} from '../lib/stats.js';
import { heatColor, TYPE_COLORS } from '../lib/theme.js';
import { FONTS } from '../lib/fonts.js';

// ─── Glass card matching web .section ───────────────────────────────────────
function Section({ title, subtitle, children }) {
  const { theme } = useApp();
  return (
    <GlassCard style={{ padding: 16, marginBottom: 14 }} radius={20}>
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom: 12 }}>
        <Text style={{ flex:1, fontSize: 13, fontWeight: '700', color: theme.muted,
          textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 11, color: theme.muted }}>{subtitle}</Text> : null}
      </View>
      {children}
    </GlassCard>
  );
}

// ─── Top filter bar — same as HomeScreen, drives all sections ───────────────
function FilterBar({ habits, category, setCategory, types, setTypes }) {
  const { theme } = useApp();
  const cats = useMemo(() => [...new Set(habits.map(h=>h.category).filter(Boolean))],[habits]);
  const TC = { go:theme.typeGo, st:theme.typeSt, ne:theme.typeNe };
  const chip = (label, active, color, onPress) => (
    // Outer wrapper overflow:visible so shadow doesn't clip vertically
    <View key={label} style={{ marginRight:6, overflow:'visible' }}>
      <Pressable onPress={onPress}
        style={{
          paddingHorizontal:14, paddingVertical:7, borderRadius:20,
          backgroundColor: active ? (color || theme.accent) : theme.surface2,
          borderWidth: 1,
          borderColor: active ? (color || theme.accent) : theme.border,
          // Subtle shadow glow — lives on the Pressable itself
          shadowColor: active ? (color || theme.accent) : 'transparent',
          shadowOffset: { width:0, height:0 },
          shadowOpacity: active ? 0.45 : 0,
          shadowRadius: active ? 8 : 0,
          elevation: 0, // elevation clips on Android — use iOS shadow only
        }}>
        <Text style={{ fontSize:14, fontWeight:'600', color: active ? '#fff' : theme.text2 }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
  return (
    <View style={{ marginBottom:4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal:20, marginBottom:6 }} contentContainerStyle={{ paddingRight:18, alignItems:'center' }}>
        {chip('All',!category,null,()=>setCategory(''))}
        {cats.map(c=>chip(c,category===c,null,()=>setCategory(category===c?'':c)))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal:18 }} contentContainerStyle={{ paddingRight:18, alignItems:'center' }}>
        {[['go','Start'],['st','Stop'],['ne','Neutral']].map(([t,lbl])=>
          chip(lbl,types.includes(t),TC[t],()=>setTypes(types.includes(t)?types.filter(x=>x!==t):[...types,t]))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
function Heatmap({ habits, prefs, onDateClick }) {
  const { theme } = useApp();
  const ref = useRef(null);
  const WEEKS = 26;
  const { cols, max } = useMemo(() => {
    const counts = new Map();
    for (const h of habits) for (const l of h.logs) counts.set(l.date,(counts.get(l.date)||0)+1);
    let mx=0; for (const v of counts.values()) if(v>mx) mx=v;
    const today=new Date(), tStr=todayStr(), dow=today.getDay();
    const end=new Date(today); end.setDate(end.getDate()+(6-dow));
    const cols=[];
    for (let w=WEEKS-1;w>=0;w--) {
      const col=[];
      for (let d=0;d<7;d++) {
        const day=new Date(end); day.setDate(day.getDate()-(w*7+(6-d)));
        const ds=day.toISOString().slice(0,10);
        col.push({date:ds,count:counts.get(ds)||0,today:ds===tStr,future:day>today});
      }
      cols.push(col);
    }
    return {cols,max:mx};
  },[habits]);
  useEffect(()=>{ setTimeout(()=>ref.current?.scrollToEnd({animated:false}),100); },[habits]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection:'row', gap:3 }}>
        {cols.map((col,ci)=>(
          <View key={ci} style={{ flexDirection:'column', gap:3 }}>
            {col.map((cell,ri)=>(
              <Pressable key={ri} onPress={()=>cell.count>0&&onDateClick(cell.date)}
                style={{ width:14, height:14, borderRadius:3,
                  backgroundColor:cell.count>0?(heatColor(cell.count,max,prefs)||theme.accent):theme.solid3,
                  borderWidth:cell.today?1.5:0, borderColor:theme.text, opacity:cell.future?0.3:1 }} />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Trends (all-time mode) ──────────────────────────────────────────────────
function TrendsCard({ habits }) {
  const { theme } = useApp();
  const PALETTE = [theme.accent,'#fb7185','#34d399','#60a5fa','#f59e0b','#a78bfa'];
  const allSeries = useMemo(()=>trendsFor(habits,30),[habits]);
  const [enabled,setEnabled] = useState(()=>new Set(allSeries.slice(0,5).map(s=>s.habit.id)));
  const visible = allSeries.filter(s=>enabled.has(s.habit.id));
  if (!allSeries.length) return null;
  const allPts = visible.flatMap(s=>s.points.map(p=>p.count));
  const maxV = Math.max(1,...allPts);
  const W=300, H=80, pL=4, pT=6, pB=6, innerW=W-pL*2, innerH=H-pT-pB;
  return (
    <Section title="Last 30 days">
      <View style={{ height:H, position:'relative', marginBottom:14 }}>
        {visible.map((s,si)=>{
          const color=PALETTE[si%PALETTE.length];
          const pts=s.points; if(pts.length<2) return null;
          return pts.slice(0,-1).map((_,pi)=>{
            const p1=pts[pi], p2=pts[pi+1];
            const x1=pL+(pi/(pts.length-1))*innerW, y1=pT+innerH-(p1.count/maxV)*innerH;
            const x2=pL+((pi+1)/(pts.length-1))*innerW, y2=pT+innerH-(p2.count/maxV)*innerH;
            const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy), ang=Math.atan2(dy,dx)*180/Math.PI;
            return <View key={`${si}-${pi}`} style={{ position:'absolute', left:x1, top:y1,
              width:len, height:2, backgroundColor:color,
              transform:[{rotate:`${ang}deg`}], transformOrigin:'0 50%' }} />;
          });
        })}
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
        {allSeries.map((s,i)=>{
          const on=enabled.has(s.habit.id), color=PALETTE[i%PALETTE.length];
          return (
            <Pressable key={s.habit.id} onPress={()=>{const n=new Set(enabled);on?n.delete(s.habit.id):n.add(s.habit.id);setEnabled(n);}}
              style={{ flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:5,
                borderRadius:12, backgroundColor:on?theme.accentDim:theme.surface2,
                borderWidth:1, borderColor:on?theme.accentBorder:theme.border }}>
              <View style={{ width:8, height:8, borderRadius:4, backgroundColor:color }} />
              <Text style={{ fontSize:12, color:on?theme.accent:theme.muted }}>{s.habit.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}

// ─── Spider ──────────────────────────────────────────────────────────────────
function buildSpiderData(habit, allHabits, sub, accentColor, dateFilter) {
  const h = habit;
  if (sub==='tags') {
    const t=tagFrequencyForHabit(h).slice(0,8); if(t.length<3) return null;
    return {axes:t.map(x=>x.tag),layers:[{label:'Tags',color:accentColor,values:t.map(x=>x.count)}]};
  }
  if (sub==='mood') {
    const m=moodCounts([h],dateFilter); const k=['good','meh','low','stressed','tired','fired up'].filter(k=>m.has(k));
    if(k.length<3) return null;
    return {axes:k,layers:[{label:'Mood',color:accentColor,values:k.map(k=>m.get(k)||0)}]};
  }
  if (sub==='energy') {
    const m=energyCounts([h],dateFilter); const k=['high','medium','low energy'].filter(k=>m.has(k));
    if(k.length<3) return null;
    return {axes:k,layers:[{label:'Energy',color:accentColor,values:k.map(k=>m.get(k)||0)}]};
  }
  if (sub==='ease') {
    // For stop habits: show resistance breakdown (matching web)
    const r=resistRate(h);
    if (r&&(r.yes+r.no+r.partial)>=3) {
      return {axes:['Resisted','Gave in','Partial'],layers:[{label:'Resistance',color:accentColor,values:[r.yes,r.no,r.partial]}]};
    }
    // For go/ne habits: ease-by-tag
    const by={};
    for (const l of h.logs) { if(!l.ease) continue; for (const t of(l.tags||[])){by[t]=by[t]||[];by[t].push(l.ease);} }
    const e=Object.entries(by).map(([tag,vals])=>({tag,avg:vals.reduce((s,v)=>s+v,0)/vals.length})).sort((a,b)=>b.avg-a.avg).slice(0,8);
    if(e.length<3) return null;
    return {axes:e.map(x=>x.tag),layers:[{label:'Ease',color:accentColor,values:e.map(x=>x.avg),max:5}]};
  }
  if (sub==='co') {
    const co=coOccurrenceFor(h,allHabits).slice(0,8); if(co.length<3) return null;
    return {axes:co.map(c=>c.habit.name),layers:[{label:'Co-logged',color:accentColor,values:co.map(c=>c.shared)}]};
  }
  return null;
}

function SpiderSection({ filtered, allHabits, dateFilter }) {
  const { theme } = useApp();
  const [view,setView]   = useState('overview');
  const [habitId,setHid] = useState('');
  const [sub,setSub]     = useState('tags');
  // Dynamic label for ease tab — "Resistance" for stop habits
  const habitOptions = useMemo(()=>filtered.filter(h=>h.logs.length>0),[filtered]);
  const selHabit = useMemo(()=>habitOptions.find(h=>h.id===habitId)||null,[habitOptions,habitId]);
  useEffect(()=>{ if(habitId&&!filtered.some(h=>h.id===habitId)) setHid(''); },[filtered,habitId]);

  const easeLabel = selHabit?.type==='st' ? 'Resistance' : 'Ease';
  const SUBS = [['tags','Tags'],['mood','Mood'],['energy','Energy'],['ease',easeLabel],['co','Co-habits']];

  const overviewData = useMemo(()=>{
    const counts=filtered.map(h=>({name:h.name,v:dateFilter?h.logs.filter(l=>l.date===dateFilter).length:h.logs.length})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,8);
    if(counts.length<3) return null;
    return {axes:counts.map(c=>c.name),layers:[{label:'Taps',color:theme.accent,values:counts.map(c=>c.v)}]};
  },[filtered,dateFilter,theme.accent]);

  const habitData = useMemo(()=>selHabit?buildSpiderData(selHabit,allHabits,sub,theme.accent,dateFilter):null,
    [selHabit,allHabits,sub,theme.accent,dateFilter]);

  const data = view==='overview' ? overviewData : habitData;

  return (
    <Section title="Spider">
      {/* View toggle — matches web .seg */}
      <View style={{ flexDirection:'row', backgroundColor:theme.surface2,
        borderWidth:1, borderColor:theme.border, borderRadius:12,
        padding:3, gap:2, alignSelf:'flex-start', marginBottom:12 }}>
        {[['overview','All habits'],['habit','Per habit']].map(([v,lbl])=>(
          <Pressable key={v} onPress={()=>setView(v)}
            style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:9,
              backgroundColor:view===v?theme.solid:'transparent',
              shadowColor:view===v?'#000':'transparent',
              shadowOffset:{width:0,height:1}, shadowOpacity:0.15, shadowRadius:3 }}>
            <Text style={{ fontSize:12, fontWeight:'600',
              color:view===v?theme.text:theme.muted }}>{lbl}</Text>
          </Pressable>
        ))}
      </View>

      {/* Habit picker (per-habit mode) */}
      {view==='habit' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:10 }} contentContainerStyle={{ gap:6 }}>
          {habitOptions.map(h=>(
            <Pressable key={h.id} onPress={()=>setHid(h.id)}
              style={{ paddingHorizontal:13, paddingVertical:7, borderRadius:12,
                backgroundColor:habitId===h.id?theme.accent:theme.surface2,
                borderWidth:1, borderColor:habitId===h.id?theme.accent:theme.border }}>
              <Text style={{ fontSize:13, fontWeight:'600', color:habitId===h.id?'#fff':theme.text2 }}>{h.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Sub-mode tabs — matches web .subtabs */}
      {view==='habit' && selHabit && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom:14 }} contentContainerStyle={{ gap:4 }}>
          {SUBS.map(([id,lbl])=>(
            <Pressable key={id} onPress={()=>setSub(id)}
              style={{ paddingHorizontal:11, paddingVertical:5, borderRadius:9,
                backgroundColor:sub===id?theme.accent:theme.solid3 }}>
              <Text style={{ fontSize:11.5, fontWeight:'600', whiteSpace:'nowrap',
                color:sub===id?'#fff':theme.muted }}>{lbl}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {data
        ? <SpiderChart axes={data.axes} layers={data.layers} size={260} />
        : <View style={{ alignItems:'center', paddingVertical:20 }}>
            <Text style={{ fontSize:13, color:theme.muted, textAlign:'center', lineHeight:20 }}>
              {view==='overview'
                ? 'Log at least 3 different habits to see how they relate to each other.'
                : !selHabit ? 'Pick a habit above to drill into its patterns.'
                : `Log more ${sub==='tags'?'tags':sub==='co'?'alongside other habits':sub} to see this chart.`}
            </Text>
          </View>
      }
    </Section>
  );
}

// ─── Rankings ────────────────────────────────────────────────────────────────
function RankingsSection({ filtered, dateFilter }) {
  const { theme } = useApp();
  const ranked = useMemo(()=>
    filtered.map(h=>({h,c:dateFilter?h.logs.filter(l=>l.date===dateFilter).length:h.logs.length}))
      .filter(x=>x.c>0).sort((a,b)=>b.c-a.c),
    [filtered,dateFilter]);
  if (!ranked.length) return null;
  const max = ranked[0].c;
  return (
    <Section title="Rankings">
      {ranked.map(({h,c})=>(
        <View key={h.id} style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:9 }}>
          <Text style={{ width:88, fontSize:13, color:theme.text2 }} numberOfLines={1}>{h.name}</Text>
          <View style={{ flex:1, height:10, borderRadius:5, backgroundColor:theme.solid3, overflow:'hidden' }}>
            <View style={{ height:'100%', width:`${(c/max)*100}%`,
              backgroundColor:TYPE_COLORS[h.type]||theme.accent, borderRadius:5 }} />
          </View>
          <Text style={{ width:28, fontSize:13, fontWeight:'600', color:theme.text, textAlign:'right' }}>{c}</Text>
        </View>
      ))}
    </Section>
  );
}

// ─── Mood & Energy ──────────────────────────────────────────────────────────
function MoodEnergySection({ filtered, dateFilter }) {
  const { theme } = useApp();
  const moodMap   = useMemo(()=>moodCounts(filtered,dateFilter),[filtered,dateFilter]);
  const energyMap = useMemo(()=>energyCounts(filtered,dateFilter),[filtered,dateFilter]);
  if (!moodMap.size&&!energyMap.size) return null;
  const renderBars = (map) => {
    const entries=[...map.entries()].sort((a,b)=>b[1]-a[1]);
    const total=entries.reduce((s,[,v])=>s+v,0);
    return entries.map(([k,v])=>(
      <View key={k} style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:7 }}>
        <Text style={{ width:90, fontSize:13, color:theme.text2 }}>{k}</Text>
        <View style={{ flex:1, height:10, borderRadius:5, backgroundColor:theme.solid3, overflow:'hidden' }}>
          <View style={{ height:'100%', width:`${(v/total)*100}%`, backgroundColor:theme.accent, borderRadius:5 }} />
        </View>
        <Text style={{ width:24, fontSize:12, color:theme.muted, textAlign:'right' }}>{v}</Text>
      </View>
    ));
  };
  return (
    <Section title="Mood & Energy">
      {moodMap.size>0&&<><Text style={{ fontSize:11, fontWeight:'700', color:theme.muted, textTransform:'uppercase', letterSpacing:0.4, marginBottom:8 }}>Mood</Text>{renderBars(moodMap)}</>}
      {energyMap.size>0&&<><Text style={{ fontSize:11, fontWeight:'700', color:theme.muted, textTransform:'uppercase', letterSpacing:0.4, marginTop:10, marginBottom:8 }}>Energy</Text>{renderBars(energyMap)}</>}
    </Section>
  );
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
function TagsSection({ filtered, dateFilter }) {
  const { theme } = useApp();
  const freqs = useMemo(()=>tagFrequency(filtered,dateFilter).slice(0,10),[filtered,dateFilter]);
  if (!freqs.length) return null;
  return (
    <Section title="Top Tags">
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:7 }}>
        {freqs.map(({tag,count})=>(
          <View key={tag} style={{ flexDirection:'row', alignItems:'center', gap:4,
            paddingLeft:11, paddingRight:5, paddingVertical:6, borderRadius:10, backgroundColor:theme.accentDim }}>
            <Text style={{ fontSize:13, fontWeight:'600', color:theme.accent }}>{tag}</Text>
            <View style={{ backgroundColor:theme.accent, borderRadius:7, paddingHorizontal:6, paddingVertical:1 }}>
              <Text style={{ fontSize:11, fontWeight:'700', color:'#fff' }}>{count}</Text>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

// ─── Day of Week ──────────────────────────────────────────────────────────────
function TimePatternsCard({ habits, dateFilter }) {
  const { theme } = useApp();
  const tod = useMemo(()=>timeOfDayBuckets(habits, dateFilter),[habits,dateFilter]);
  const dow = useMemo(()=>dayOfWeekBuckets(habits),[habits]);
  const dowMax = Math.max(...dow,1);
  const DOW = ['S','M','T','W','T','F','S'];
  const TOD_ORDER = ['Morning','Afternoon','Evening','Night'];
  const todMax = Math.max(...Object.values(tod),1);
  return (
    <Section title="Time categories">
      <View style={{ flexDirection:'row', gap:16 }}>
        {/* Time of day — left column */}
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.4, marginBottom:8 }}>Time of day</Text>
          {TOD_ORDER.map(k=>(
            <View key={k} style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:7 }}>
              <Text style={{ width:68, fontSize:13, color:theme.text2 }}>{k}</Text>
              <View style={{ flex:1, height:8, borderRadius:4, backgroundColor:theme.solid3, overflow:'hidden' }}>
                <View style={{ height:'100%', width:`${(tod[k]/todMax)*100}%`,
                  backgroundColor:theme.accent, borderRadius:4, opacity:0.80 }} />
              </View>
              <Text style={{ width:28, fontSize:12, fontWeight:'600', color:theme.text, textAlign:'right' }}>
                {tod[k]}
              </Text>
            </View>
          ))}
        </View>
        {/* Day of week — right column */}
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.4, marginBottom:8 }}>Day of week</Text>
          <View style={{ flexDirection:'row', alignItems:'flex-end', height:72, gap:3 }}>
            {dow.map((count,i)=>(
              <View key={i} style={{ flex:1, alignItems:'center', gap:3, justifyContent:'flex-end', height:'100%' }}>
                <View style={{ width:'100%', height:Math.max(3,(count/dowMax)*56),
                  borderRadius:3, backgroundColor:theme.accent, opacity:0.85 }} />
                <Text style={{ fontSize:10, fontWeight:'600', color:theme.muted }}>{DOW[i]}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Section>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { data, theme } = useApp();
  const allHabits = data?.habits || [];
  const prefs     = data?.prefs  || {};

  const [mode,     setMode]     = useState(prefs.insDay?'day':'all');
  const [date,     setDate]     = useState(todayStr());
  const [category, setCategory] = useState('');
  const [types,    setTypes]    = useState([]);

  // Single filtered set — drives ALL sections below
  const filtered = useMemo(()=>{
    let l = allHabits.slice();
    if (category) l = l.filter(h=>h.category===category);
    if (types.length) l = l.filter(h=>types.includes(h.type));
    return l;
  },[allHabits,category,types]);

  const df = mode==='day' ? date : null;
  const totalLogs = useMemo(()=>filtered.reduce((s,h)=>s+(df?h.logs.filter(l=>l.date===df).length:h.logs.length),0),[filtered,df]);

  return (
    <View style={{ flex:1, backgroundColor:theme.bg }}>
      {/* Topbar — matches web */}
      <View style={{ flexDirection:'row', alignItems:'center',
        paddingHorizontal:20, paddingTop:insets.top+10, paddingBottom:16 }}>
          <Text style={{ flex:1, fontSize:30, fontWeight:'700', color:theme.text,
            fontFamily:FONTS.heading, letterSpacing:-0.025 }}>Analytics</Text>
          {/* Seg control matching web */}
          <View style={{ flexDirection:'row', backgroundColor:theme.surface2,
            borderRadius:12, borderWidth:1, borderColor:theme.border, padding:3, gap:2 }}>
            {([['day','Day',Clock],['all','All',Sigma]]).map(([id,lbl,IconComp])=>(
              <Pressable key={id} onPress={()=>setMode(id)}
                style={{ flexDirection:'row', alignItems:'center', gap:5,
                  paddingHorizontal:11, paddingVertical:7,
                  borderRadius:9, backgroundColor:mode===id?theme.solid:'transparent' }}>
                <IconComp size={14} strokeWidth={2} color={mode===id?theme.text:theme.muted} />
                <Text style={{ fontSize:13, fontWeight:'600',
                  color:mode===id?theme.text:theme.muted }}>{lbl}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      {/* Date nav (day mode) */}
      {mode==='day' && (
        <View style={{ flexDirection:'row', alignItems:'center',
          paddingHorizontal:20, marginBottom:8, gap:10 }}>
          <Pressable onPress={()=>setDate(shiftDate(date,-1))}
            style={{ width:38, height:38, borderRadius:12, backgroundColor:theme.surface2,
              borderWidth:1, borderColor:theme.border, alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={20} strokeWidth={2} color={theme.text2} />
          </Pressable>
          <Text style={{ flex:1, textAlign:'center', fontSize:15, fontWeight:'600', color:theme.text }}>
            {fmtDateLong(date)}
          </Text>
          <Pressable onPress={()=>setDate(shiftDate(date,1))} disabled={date>=todayStr()}
            style={{ width:38, height:38, borderRadius:12, backgroundColor:theme.surface2,
              borderWidth:1, borderColor:theme.border, alignItems:'center', justifyContent:'center',
              opacity:date>=todayStr()?0.35:1 }}>
            <ChevronRight size={20} strokeWidth={2} color={theme.text2} />
          </Pressable>
        </View>
      )}

      {/* Single filter bar — drives all sections */}
      <FilterBar habits={allHabits} category={category} setCategory={setCategory}
        types={types} setTypes={setTypes} />

      <ScrollView contentContainerStyle={{ paddingHorizontal:20, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>

        {/* Summary strip — matches web "All time" / "This day" section */}
        {totalLogs>0 ? (
          <Section title={mode==='day'?'This day':'All time'}>
          <View style={{ flexDirection:'row', gap:10 }}>
            {[['Taps',totalLogs],['Habits',filtered.filter(h=>!df||h.logs.some(l=>l.date===df)).length],
              ['Tagged',filtered.reduce((s,h)=>s+h.logs.filter(l=>l.tags.length>0&&(!df||l.date===df)).length,0)]
            ].map(([l,v])=>(
              <GlassCard key={l} style={{ flex:1, padding:14, alignItems:'center' }} radius={18} variant="flat">
                <Text style={{ fontSize:10, fontWeight:'600', color:theme.muted,
                  textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{l}</Text>
                <Text style={{ fontSize:26, fontWeight:'700', color:theme.text, letterSpacing:-0.03 }}>{v}</Text>
              </GlassCard>
            ))}
          </View>
          </Section>
        ) : (
          <GlassCard style={{ padding:32, alignItems:'center', marginBottom:14 }} radius={20}>
            <Text style={{ fontSize:17, fontWeight:'600', color:theme.text,
              marginBottom:6, fontFamily:FONTS.heading }}>No data yet</Text>
            <Text style={{ fontSize:13, color:theme.muted, textAlign:'center', lineHeight:20 }}>
              {mode==='day'?'Nothing logged on this date.':'Log some habits to see analytics.'}
            </Text>
          </GlassCard>
        )}

        {/* Heatmap */}
        {prefs.sections?.heatmap!==false && filtered.length>0 && (
          <Section title="Activity Heatmap" subtitle="tap a day to focus it">
            <Heatmap habits={filtered} prefs={prefs} onDateClick={d=>{setMode('day');setDate(d);}} />
          </Section>
        )}

        {/* Hourly (day mode only) */}
        {mode==='day' && prefs.sections?.hourly!==false && (() => {
          const buckets=hourlyBucketsFor(filtered,date);
          const hMax=Math.max(1,...buckets.map(b=>b.go+b.st+b.ne));
          return (
            <Section title="By Hour">
              <View style={{ flexDirection:'row', alignItems:'flex-end', height:80, gap:2, marginBottom:4 }}>
                {buckets.map((b,i)=>{
                  const tot=b.go+b.st+b.ne;
                  if(!tot) return <View key={i} style={{ flex:1, height:3, backgroundColor:theme.solid3, borderRadius:1 }}/>;
                  const h=(tot/hMax)*80;
                  return (
                    <View key={i} style={{ flex:1, height:h, borderRadius:3, overflow:'hidden', flexDirection:'column-reverse' }}>
                      {b.go>0&&<View style={{ flex:b.go, backgroundColor:theme.typeGo }}/>}
                      {b.st>0&&<View style={{ flex:b.st, backgroundColor:theme.typeSt }}/>}
                      {b.ne>0&&<View style={{ flex:b.ne, backgroundColor:theme.typeNe }}/>}
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                {['12a','6a','12p','6p','11p'].map(l=><Text key={l} style={{ fontSize:10, color:theme.muted }}>{l}</Text>)}
              </View>
            </Section>
          );
        })()}

        {/* Trends (all-time mode) */}
        {mode==='all' && prefs.sections?.trends!==false && filtered.length>0 && (
          <TrendsCard habits={filtered} />
        )}

        {/* Spider */}
        {prefs.sections?.spider!==false && totalLogs>0 && (
          <SpiderSection filtered={filtered} allHabits={allHabits} dateFilter={df} />
        )}

        {/* Rankings */}
        {prefs.sections?.rankings!==false && totalLogs>0 && (
          <RankingsSection filtered={filtered} dateFilter={df} />
        )}

        {/* Mood & Energy */}
        {prefs.sections?.mood!==false && totalLogs>0 && (
          <MoodEnergySection filtered={filtered} dateFilter={df} />
        )}

        {/* Time categories (TOD left + DOW right) */}
        {mode==='all' && prefs.sections?.time!==false && totalLogs>0 && (
          <TimePatternsCard habits={filtered} dateFilter={df} />
        )}

        {/* Tags */}
        {prefs.sections?.tags!==false && (
          <TagsSection filtered={filtered} dateFilter={df} />
        )}

      </ScrollView>
    </View>
  );
}
