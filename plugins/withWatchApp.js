/**
 * Expo config plugin — Sprout Watch App + JSON import target
 *
 * EAS handles 100% of the Xcode work automatically.
 * One one-time step at developer.apple.com (no Xcode needed):
 *
 *   Create the Watch App ID:
 *     developer.apple.com → Certificates, Identifiers & Profiles
 *       → Identifiers → + → App IDs → Continue → App → Continue
 *       Description:  "Sprout Watch"
 *       Bundle ID:    sprout.richdmart.in.watchkitapp   (Explicit)
 *       → Continue → Register
 *       (No capabilities to check — WatchConnectivity is a plain framework.)
 *
 *   Then set WATCH_READY = true, push, trigger EAS build.
 *   EAS managed credentials will auto-generate a profile for the watch bundle ID.
 *
 * WHY we never use addFile / addSourceFile / addFramework from the xcode package:
 *   1. addSourceFile broadcasts to ALL PBXSourcesBuildPhase entries in the project,
 *      not just the specified target's phase → "Unexpected duplicate tasks".
 *   2. addFile(path, group, opt) + addSourceFile(path, {}, target) for the same
 *      path: addSourceFile calls addFile internally; hasFile() returns true on the
 *      second call → addSourceFile returns false → file never enters compile sources.
 *   3. project.addTarget('watch2_app') may auto-populate the new target's phases
 *      with default entries; writing those entries again → duplicate tasks.
 *
 *   Solution: write every PBXFileReference / PBXBuildFile / phase entry directly
 *   into project.hash.project.objects, with duplicate guards on every phase write.
 */

const WATCH_READY = true;

const {
  withXcodeProject,
  withDangerousMod,
  withInfoPlist,
} = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

const WATCH_TARGET  = 'SproutWatch';
const WATCH_SUFFIX  = '.watchkitapp';
const WATCH_OS_MIN  = '8.0';
const SWIFT_VER     = '5.0';
const SWIFT_SOURCES = [
  'SproutWatchApp.swift',
  'WatchDataModel.swift',
  'HabitListView.swift',
  'HabitRowView.swift',
  'QuickLogView.swift',
];

// ─────────────────────────────────────────────────────────────────────────────

module.exports = function withWatchApp(config) {
  config = withInfoPlist(config, addDocumentTypes);
  config = withDangerousMod(config, ['ios', copyFiles]);
  config = withXcodeProject(config, modifyProject);
  return config;
};

// ── Info.plist: accept JSON files via Share Sheet ─────────────────────────────
function addDocumentTypes(cfg) {
  const existing = cfg.modResults.CFBundleDocumentTypes ?? [];
  const alreadyDeclared = existing.some(t => t.CFBundleTypeName === 'Sprout Data');
  if (!alreadyDeclared) {
    cfg.modResults.CFBundleDocumentTypes = [
      ...existing,
      {
        CFBundleTypeName:       'Sprout Data',
        CFBundleTypeRole:       'Editor',
        LSItemContentTypes:     ['public.json'],
        CFBundleTypeExtensions: ['json'],
      },
    ];
  }
  return cfg;
}

// ── Copy source files into ios/ ───────────────────────────────────────────────
// NOTE: In Expo's mod pipeline, the dangerous phase runs BEFORE xcodeproj.
// We use this function only for file I/O (source copies + Info.plist write).
// Scheme patching is done in modifyProject (xcodeproj phase) where we have the
// watch target UUID directly from addTarget and the scheme file already exists.
async function copyFiles(cfg) {
  const { projectRoot, platformProjectRoot, projectName } = cfg.modRequest;

  const bridgeSrc = path.join(projectRoot, 'modules', 'watch-bridge', 'ios');
  const bridgeDst = path.join(platformProjectRoot, 'SproutWatchBridge');
  mkdirp(bridgeDst);
  // Pure ObjC implementation — no Swift file, no bridging-header dependency.
  for (const f of ['SproutWatchBridge.h', 'SproutWatchBridge.m']) {
    cp(path.join(bridgeSrc, f), path.join(bridgeDst, f));
  }

  if (!WATCH_READY) return cfg;

  const watchSrc = path.join(projectRoot, 'watch', WATCH_TARGET);
  const watchDst = path.join(platformProjectRoot, WATCH_TARGET);
  mkdirp(watchDst);
  for (const f of SWIFT_SOURCES) {
    cp(path.join(watchSrc, f), path.join(watchDst, f));
  }

  const bundleId = cfg.ios?.bundleIdentifier ?? 'sprout.richdmart.in';
  fs.writeFileSync(path.join(watchDst, 'Info.plist'), watchInfoPlist(bundleId));

  // Asset catalog for watch app icon (fixes ASC errors 90391 / 90713).
  // The marketing icon (1024x1024) is required for App Store submission.
  // We reuse the main app icon from assets/icon.png (Expo convention: 1024x1024 PNG).
  const xcassetsDir    = path.join(watchDst, 'Assets.xcassets');
  const appiconsetDir  = path.join(xcassetsDir, 'AppIcon.appiconset');
  mkdirp(appiconsetDir);

  const iconContents = JSON.stringify({
    images: [
      {
        filename: 'icon.png',
        idiom: 'watch-marketing',
        scale: '1x',
        size: '1024x1024',
      },
    ],
    info: { author: 'xcode', version: 1 },
  }, null, 2);
  fs.writeFileSync(path.join(appiconsetDir, 'Contents.json'), iconContents);

  // Root Contents.json (required by Xcode for every .xcassets bundle)
  fs.writeFileSync(
    path.join(xcassetsDir, 'Contents.json'),
    JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2),
  );

  // Copy the 1024×1024 icon from assets/icon.png
  const mainIcon = path.join(projectRoot, 'assets', 'icon.png');
  cp(mainIcon, path.join(appiconsetDir, 'icon.png'));

  // Fallback scheme patch: if by some Expo version the xcodeproj mod ran first,
  // the UUID will be readable here.  The idempotency guard in patchScheme makes
  // this a no-op if modifyProject already patched it.
  const watchTargetUuid = readWatchTargetUuid(platformProjectRoot, projectName);
  if (watchTargetUuid) {
    patchScheme(platformProjectRoot, projectName, watchTargetUuid);
  }

  return cfg;
}

// ── Xcode project modifications ───────────────────────────────────────────────
function modifyProject(cfg) {
  const project     = cfg.modResults;
  const bundleId    = cfg.ios?.bundleIdentifier ?? 'sprout.richdmart.in';
  const watchId     = `${bundleId}${WATCH_SUFFIX}`;
  const mainUuid    = project.getFirstTarget().uuid;
  // Expo copies scheme files from templates before ANY plugin mod runs,
  // so the scheme file already exists on disk here in the xcodeproj phase.
  const { platformProjectRoot, projectName } = cfg.modRequest;

  // ── STEP 1: Bridge files → main target (fully direct, idempotent) ─────────
  // Pure ObjC: SproutWatchBridge.h (header, group only) + .m (compiled).
  // No Swift file needed — avoids bridging-header / RCTEventEmitter scope issues.
  const bridgeGroupKey = project.findPBXGroupKey({ name: 'SproutWatchBridge' });
  if (!bridgeGroupKey) {
    const bridgeGroup = project.addPbxGroup([], 'SproutWatchBridge', 'SproutWatchBridge');

    // Header — add to group for navigation, NOT to compile sources
    const hRefId = ensureFileRef(project, 'SproutWatchBridge/SproutWatchBridge.h', 'SproutWatchBridge.h', 'sourcecode.c.h');
    addToGroup(project, hRefId, 'SproutWatchBridge.h', bridgeGroup.uuid);

    // Implementation — add to group AND compile sources
    const mRefId = ensureFileRef(project, 'SproutWatchBridge/SproutWatchBridge.m', 'SproutWatchBridge.m');
    addToGroup(project, mRefId, 'SproutWatchBridge.m', bridgeGroup.uuid);
    addToSourcesPhase(project, mRefId, 'SproutWatchBridge.m', mainUuid);

    addFrameworkToTarget(project, 'WatchConnectivity.framework', mainUuid);
  }

  if (!WATCH_READY) return cfg;

  // ── STEP 2: Watch target (idempotent via target-name check) ───────────────
  const allTargets = Object.values(project.pbxNativeTargetSection());
  if (allTargets.some(t => t.name === WATCH_TARGET || t.name === `"${WATCH_TARGET}"`)) return cfg;

  const watchTarget = project.addTarget(WATCH_TARGET, 'watch2_app', WATCH_TARGET, watchId);

  // Override the product type set by addTarget('watch2_app').
  // 'watch2_app' → com.apple.product-type.application.watchapp2 (legacy stub-based)
  // Modern watchOS apps (watchOS 7+, WKApplication=YES) must use the plain
  // application type; the stub binary causes ASC error 90171 / 90125.
  {
    const objs = project.hash.project.objects;
    const nt   = project.pbxNativeTargetSection()[watchTarget.uuid];
    if (nt) {
      nt.productType = '"com.apple.product-type.application"';
      const prodRef = nt.productReference;
      if (prodRef) {
        const fr = (objs['PBXFileReference'] || {})[prodRef];
        if (fr) {
          fr.explicitFileType = '"wrapper.application"';
          delete fr.lastKnownFileType;
        }
      }
    }
  }

  // ── STEP 3: Watch source files → watch target's phase DIRECTLY ────────────
  const watchGroup = project.addPbxGroup([], WATCH_TARGET, WATCH_TARGET);

  for (const f of SWIFT_SOURCES) {
    const fp        = `${WATCH_TARGET}/${f}`;
    const fileRefId = ensureFileRef(project, fp, f);
    addToGroup(project, fileRefId, f, watchGroup.uuid);
    addToSourcesPhase(project, fileRefId, f, watchTarget.uuid);
  }

  // Info.plist — resource only, not compiled
  const plistRefId = ensureFileRef(project, `${WATCH_TARGET}/Info.plist`, 'Info.plist', 'text.plist.xml');
  addToGroup(project, plistRefId, 'Info.plist', watchGroup.uuid);

  // Asset catalog — watch icons (AppIcon.appiconset created by copyFiles)
  const xcassetsRefId = ensureFileRef(project, `${WATCH_TARGET}/Assets.xcassets`, 'Assets.xcassets', 'folder.assetcatalog');
  addToGroup(project, xcassetsRefId, 'Assets.xcassets', watchGroup.uuid);
  addToResourcesPhase(project, xcassetsRefId, 'Assets.xcassets', watchTarget.uuid);

  // ── STEP 4: WatchKit.framework → watch target's framework phase DIRECTLY ──
  addFrameworkToTarget(project, 'WatchKit.framework', watchTarget.uuid);

  // ── STEP 5: Build settings ─────────────────────────────────────────────────
  // EAS Managed Credentials injects DEVELOPMENT_TEAM only for targets whose
  // bundle IDs it manages (i.e. targets in the provisioning profile mapping).
  // The watch target is NOT auto-discovered by EAS's credential scan, so EAS
  // never sets DEVELOPMENT_TEAM for it.  xcodebuild validates signing for every
  // target in the scheme BEFORE compiling — a missing team fails the archive
  // immediately with "requires a development team", producing zero compile lines.
  //
  // Fix: read ios.teamId from app.json and stamp it directly into the watch
  // target's build settings here.  The user must add "teamId" to app.json → ios.
  const teamId = cfg.ios?.teamId;
  applyBuildSettings(project, watchTarget.uuid, {
    SDKROOT:                   'watchos',
    TARGETED_DEVICE_FAMILY:    '"4"',
    SWIFT_VERSION:             `"${SWIFT_VER}"`,
    WATCHOS_DEPLOYMENT_TARGET: `"${WATCH_OS_MIN}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${watchId}"`,
    INFOPLIST_FILE:            `"${WATCH_TARGET}/Info.plist"`,
    PRODUCT_NAME:              '"$(TARGET_NAME)"',
    CODE_SIGN_STYLE:                    '"Automatic"',
    ASSETCATALOG_COMPILER_APPICON_NAME: '"AppIcon"',
    // Explicit watchOS device architectures — arm64_32 (Series 4-6) and arm64
    // (Series 7+). Without this, EAS's build environment may inherit iOS ARCHS
    // settings and produce a binary Apple's validator rejects with error 90085.
    ARCHS:              '"arm64_32 arm64"',
    ONLY_ACTIVE_ARCH:   '"NO"',
    EXCLUDED_ARCHS:     '""',
    // teamId is the 10-character Apple Developer Team ID (e.g. "ABC123DEF4").
    // Without this, xcodebuild refuses to validate signing for the watch target.
    ...(teamId ? { DEVELOPMENT_TEAM: teamId } : {}),
  });

  // ── STEP 6: Patch auto-created embed phase ────────────────────────────────
  // addTarget('watch2_app') already creates "Embed Watch Content" in the main
  // target with SproutWatch.app. We just need to add CodeSignOnCopy to that
  // build file. (Calling a second addBuildPhase would duplicate the phase.)
  patchEmbedPhase(project, mainUuid, watchTarget);

  // ── STEP 7: Add watch target to the Xcode scheme's build action ───────────
  // xcodebuild archive only builds targets explicitly listed in the scheme's
  // <BuildActionEntries> with buildForArchiving="YES".  Target dependencies
  // control build order, not inclusion.  Without this entry SproutWatch is
  // silently skipped and SproutWatch.app never exists for the embed phase.
  //
  // The dangerous mod runs BEFORE xcodeproj (counter-intuitive but confirmed),
  // so we do this here in the xcodeproj phase where we already have:
  //   • watchTarget.uuid — the real UUID we just got from addTarget
  //   • the scheme file — Expo copies it from templates before any mod runs
  patchScheme(platformProjectRoot, projectName, watchTarget.uuid);

  return cfg;
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

/**
 * Find or create a PBXFileReference for filePath; return its UUID.
 * Never calls project.addFile — avoids the hasFile short-circuit bug.
 */
function ensureFileRef(project, filePath, fileName, fileType) {
  const objs = project.hash.project.objects;
  objs['PBXFileReference'] = objs['PBXFileReference'] || {};
  const refs = objs['PBXFileReference'];

  const quoted = `"${filePath}"`;
  const existing = Object.keys(refs).find(
    k => !k.endsWith('_comment') && (refs[k].path === quoted || refs[k].path === filePath)
  );
  if (existing) return existing;

  const ext = filePath.split('.').pop();
  const lastKnownFileType = fileType || {
    swift: 'sourcecode.swift',
    m:     'sourcecode.c.objc',
    plist: 'text.plist.xml',
  }[ext] || 'file';

  const uuid = project.generateUuid();
  refs[uuid] = { isa: 'PBXFileReference', lastKnownFileType, path: quoted, sourceTree: '"<group>"' };
  refs[`${uuid}_comment`] = fileName;
  return uuid;
}

/** Add a fileRef UUID to a PBXGroup (with duplicate guard). */
function addToGroup(project, fileRefUuid, fileName, groupUuid) {
  const objs  = project.hash.project.objects;
  const group = (objs['PBXGroup'] || {})[groupUuid];
  if (!group) return;
  group.children = group.children || [];
  if (group.children.some(c => c.value === fileRefUuid)) return;
  group.children.push({ value: fileRefUuid, comment: fileName });
}

/**
 * Add fileRefUuid to a specific target's PBXSourcesBuildPhase.
 * Duplicate guard: skips if any existing PBXBuildFile already points to fileRefUuid.
 */
function addToSourcesPhase(project, fileRefUuid, fileName, targetUuid) {
  const objs   = project.hash.project.objects;
  const target = project.pbxNativeTargetSection()[targetUuid];
  if (!target) return;

  const sourcePhaseUuid = (target.buildPhases || [])
    .map(p => p.value)
    .find(uuid => objs['PBXSourcesBuildPhase']?.[uuid]);
  if (!sourcePhaseUuid) return;

  const phase = objs['PBXSourcesBuildPhase'][sourcePhaseUuid];
  phase.files = phase.files || [];

  const alreadyPresent = phase.files.some(entry => {
    const bf = (objs['PBXBuildFile'] || {})[entry.value];
    return bf && bf.fileRef === fileRefUuid;
  });
  if (alreadyPresent) return;

  const bfUuid = project.generateUuid();
  objs['PBXBuildFile'] = objs['PBXBuildFile'] || {};
  objs['PBXBuildFile'][bfUuid] = { isa: 'PBXBuildFile', fileRef: fileRefUuid, fileRef_comment: fileName };
  objs['PBXBuildFile'][`${bfUuid}_comment`] = `${fileName} in Sources`;
  phase.files.push({ value: bfUuid, comment: `${fileName} in Sources` });
}

/**
 * Add fileRefUuid to a specific target's PBXResourcesBuildPhase.
 * Duplicate guard: skips if the phase already contains a build file for fileRefUuid.
 */
function addToResourcesPhase(project, fileRefUuid, fileName, targetUuid) {
  const objs   = project.hash.project.objects;
  const target = project.pbxNativeTargetSection()[targetUuid];
  if (!target) return;

  const resPhaseUuid = (target.buildPhases || [])
    .map(p => p.value)
    .find(uuid => objs['PBXResourcesBuildPhase']?.[uuid]);
  if (!resPhaseUuid) return;

  const phase = objs['PBXResourcesBuildPhase'][resPhaseUuid];
  phase.files = phase.files || [];

  const alreadyPresent = phase.files.some(entry => {
    const bf = (objs['PBXBuildFile'] || {})[entry.value];
    return bf && bf.fileRef === fileRefUuid;
  });
  if (alreadyPresent) return;

  const bfUuid = project.generateUuid();
  objs['PBXBuildFile'] = objs['PBXBuildFile'] || {};
  objs['PBXBuildFile'][bfUuid] = { isa: 'PBXBuildFile', fileRef: fileRefUuid, fileRef_comment: fileName };
  objs['PBXBuildFile'][`${bfUuid}_comment`] = `${fileName} in Resources`;
  phase.files.push({ value: bfUuid, comment: `${fileName} in Resources` });
}

/**
 * Add a system framework to a specific target's PBXFrameworksBuildPhase.
 * Duplicate guard: skips if the phase already contains a build file for this framework.
 * Uses SDKROOT sourceTree; never calls project.addFile (avoids group-lookup crash).
 */
function addFrameworkToTarget(project, frameworkName, targetUuid) {
  const objs = project.hash.project.objects;

  // Find or create PBXFileReference for the framework
  objs['PBXFileReference'] = objs['PBXFileReference'] || {};
  const refs = objs['PBXFileReference'];
  let fwRefUuid = Object.keys(refs).find(
    k => !k.endsWith('_comment') && refs[k].path === `"${frameworkName}"`
  );
  if (!fwRefUuid) {
    fwRefUuid = project.generateUuid();
    refs[fwRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.framework',
      name: `"${frameworkName}"`,
      path: `"${frameworkName}"`,
      sourceTree: 'SDKROOT',
    };
    refs[`${fwRefUuid}_comment`] = frameworkName;
  }

  const target = project.pbxNativeTargetSection()[targetUuid];
  if (!target) return;

  const fwPhaseUuid = (target.buildPhases || [])
    .map(p => p.value)
    .find(uuid => objs['PBXFrameworksBuildPhase']?.[uuid]);
  if (!fwPhaseUuid) return;

  const phase = objs['PBXFrameworksBuildPhase'][fwPhaseUuid];
  phase.files = phase.files || [];

  const alreadyLinked = phase.files.some(entry => {
    const bf = (objs['PBXBuildFile'] || {})[entry.value];
    return bf && bf.fileRef === fwRefUuid;
  });
  if (alreadyLinked) return;

  const bfUuid = project.generateUuid();
  objs['PBXBuildFile'] = objs['PBXBuildFile'] || {};
  objs['PBXBuildFile'][bfUuid] = { isa: 'PBXBuildFile', fileRef: fwRefUuid, fileRef_comment: frameworkName };
  objs['PBXBuildFile'][`${bfUuid}_comment`] = `${frameworkName} in Frameworks`;
  phase.files.push({ value: bfUuid, comment: `${frameworkName} in Frameworks` });
}

/**
 * addTarget('watch2_app') auto-creates "Embed Watch Content" in the main target.
 * This patches that build file entry to add CodeSignOnCopy so the watch app is
 * codesigned when embedded during distribution builds.
 */
function patchEmbedPhase(project, mainTargetUuid, watchTarget) {
  const objs       = project.hash.project.objects;
  const mainTarget = project.pbxNativeTargetSection()[mainTargetUuid];
  if (!mainTarget) return;

  const productRef = watchTarget.pbxNativeTarget?.productReference;

  for (const phaseEntry of (mainTarget.buildPhases || [])) {
    const phase = (objs['PBXCopyFilesBuildPhase'] || {})[phaseEntry.value];
    if (!phase) continue;
    if (phase.dstPath !== '"$(CONTENTS_FOLDER_PATH)/Watch"') continue;

    for (const fileEntry of (phase.files || [])) {
      const bf = (objs['PBXBuildFile'] || {})[fileEntry.value];
      if (!bf) continue;
      if (productRef && bf.fileRef !== productRef) continue;
      bf.settings = bf.settings || {};
      bf.settings.ATTRIBUTES = bf.settings.ATTRIBUTES || [];
      if (!bf.settings.ATTRIBUTES.includes('CodeSignOnCopy')) {
        bf.settings.ATTRIBUTES.push('CodeSignOnCopy');
      }
    }
  }
}

/**
 * Read the SproutWatch PBXNativeTarget UUID from the already-written pbxproj.
 * Returns null if the target isn't there (e.g. WATCH_READY was false on this
 * run so addTarget was never called).
 */
function readWatchTargetUuid(platformProjectRoot, projectName) {
  const pbxprojPath = path.join(
    platformProjectRoot,
    `${projectName}.xcodeproj`,
    'project.pbxproj',
  );
  if (!fs.existsSync(pbxprojPath)) return null;

  const content = fs.readFileSync(pbxprojPath, 'utf8');
  // pbxproj line looks like:
  //   AABBCCDD11223344AABBCCDD /* SproutWatch */ = {
  //       isa = PBXNativeTarget;
  // The UUID is always 24 uppercase hex chars.
  const re = /([A-F0-9]{24})\s*\/\*\s*SproutWatch\s*\*\/\s*=\s*\{[\s\S]{0,120}?isa\s*=\s*PBXNativeTarget/;
  const m  = content.match(re);
  return m ? m[1] : null;
}

/**
 * Patch the Xcode scheme so the watch target is included in the build action.
 *
 * xcodebuild archive only builds targets that are explicitly listed in the
 * scheme's <BuildActionEntries> — target dependencies alone are not enough.
 * This adds a BuildActionEntry for SproutWatch if one isn't already present.
 *
 * Called from modifyProject (xcodeproj phase) with the UUID straight from
 * addTarget.  The scheme file already exists (Expo copies it from templates
 * before any plugin mod runs).
 */
function patchScheme(platformProjectRoot, projectName, watchTargetUuid) {
  const schemesDir = path.join(
    platformProjectRoot,
    `${projectName}.xcodeproj`,
    'xcshareddata',
    'xcschemes',
  );

  // Find the scheme file — it may not be named exactly <projectName>.xcscheme
  // if Expo generated it with a different casing or prefix.
  let schemeFile = path.join(schemesDir, `${projectName}.xcscheme`);
  if (!fs.existsSync(schemeFile)) {
    // Try any .xcscheme in that directory
    const found = fs.existsSync(schemesDir)
      ? fs.readdirSync(schemesDir).find(f => f.endsWith('.xcscheme'))
      : null;
    if (!found) return; // no scheme — nothing to patch
    schemeFile = path.join(schemesDir, found);
  }

  let xml = fs.readFileSync(schemeFile, 'utf8');

  // Idempotency: if SproutWatch is already in the scheme, leave it alone.
  if (xml.includes('SproutWatch')) return;

  // Build the new entry.  Indentation matches what Xcode writes.
  const entry = [
    '         <BuildActionEntry',
    '            buildForTesting = "YES"',
    '            buildForRunning = "YES"',
    '            buildForProfiling = "YES"',
    '            buildForArchiving = "YES"',
    '            buildForAnalyzing = "YES">',
    '            <BuildableReference',
    '               BuildableIdentifier = "primary"',
    `               BlueprintIdentifier = "${watchTargetUuid}"`,
    '               BuildableName = "SproutWatch.app"',
    '               BlueprintName = "SproutWatch"',
    `               ReferencedContainer = "container:${projectName}.xcodeproj">`,
    '            </BuildableReference>',
    '         </BuildActionEntry>',
  ].join('\n');

  // Insert just before </BuildActionEntries>
  if (!xml.includes('</BuildActionEntries>')) {
    // Scheme has no BuildActionEntries section at all — wrap and inject
    const placeholder = '<BuildAction';
    const insertionXml = xml.replace(
      placeholder,
      `<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">\n      <BuildActionEntries>\n${entry}\n      </BuildActionEntries>\n   `,
    );
    // Only write if we actually changed something
    if (insertionXml !== xml) {
      fs.writeFileSync(schemeFile, insertionXml, 'utf8');
      return;
    }
  }

  xml = xml.replace(
    '</BuildActionEntries>',
    `${entry}\n      </BuildActionEntries>`,
  );
  fs.writeFileSync(schemeFile, xml, 'utf8');
}

function applyBuildSettings(project, targetUuid, settings) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  if (!target) return;

  const objs       = project.hash.project.objects;
  const configList = (objs['XCConfigurationList'] || {})[target.buildConfigurationList];
  if (!configList) return;

  for (const entry of configList.buildConfigurations || []) {
    const config = (objs['XCBuildConfiguration'] || {})[entry.value];
    if (config?.buildSettings) Object.assign(config.buildSettings, settings);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function watchInfoPlist(mainBundleId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>$(DEVELOPMENT_LANGUAGE)</string>
\t<key>CFBundleDisplayName</key>
\t<string>Sprout</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>CFBundleIconName</key>
\t<string>AppIcon</string>
\t<key>WKApplication</key>
\t<true/>
\t<key>WKCompanionAppBundleIdentifier</key>
\t<string>${mainBundleId}</string>
</dict>
</plist>`;
}

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function cp(src, dst) {
  if (fs.existsSync(src)) fs.copyFileSync(src, dst);
}
