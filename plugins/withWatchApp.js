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

const WATCH_READY        = process.env.INCLUDE_WATCH_APP !== 'false';
// Watch widget profile needs bundle ID sprout.richdmart.in.watchkitapp.SproutWatchWidget
// Create that App ID + profile in developer.apple.com, then set this to true.
const WATCH_WIDGET_READY = false;

const {
  withXcodeProject,
  withDangerousMod,
  withInfoPlist,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

const WATCH_TARGET  = 'SproutWatch';
const WATCH_SUFFIX  = '.watchkitapp';
const WATCH_OS_MIN  = '10.0';
const IOS_MIN       = '16.0';
const SWIFT_VER     = '5.0';
const APP_GROUP     = 'group.sprout.richdmart.in';

const SWIFT_SOURCES = [
  'SproutWatchApp.swift',
  'WatchDataModel.swift',
  'HabitListView.swift',
  'HabitRowView.swift',
  'HabitGridTile.swift',
  'HourlyActivityView.swift',
  'QuickLogView.swift',
  'WatchSettingsView.swift',
  'CategoryPickerView.swift',
  'SproutShortcuts.swift',
];

// Widget targets
const WIDGET_TARGET        = 'SproutWidget';
const WIDGET_SOURCES       = ['SproutWidget.swift', 'SproutWidgetBundle.swift'];
const WATCH_WIDGET_TARGET  = 'SproutWatchWidget';
const WATCH_WIDGET_SOURCES = ['SproutWatchWidget.swift', 'SproutWatchWidgetBundle.swift'];

// ─────────────────────────────────────────────────────────────────────────────

module.exports = function withWatchApp(config) {
  config = withInfoPlist(config, addDocumentTypes);
  config = withEntitlementsPlist(config, addAppGroups);
  config = withDangerousMod(config, ['ios', copyFiles]);
  config = withXcodeProject(config, modifyProject);
  return config;
};

// ── App Groups entitlement on main iOS app ────────────────────────────────────
function addAppGroups(cfg) {
  const groups = cfg.modResults['com.apple.security.application-groups'] ?? [];
  if (!groups.includes(APP_GROUP)) {
    cfg.modResults['com.apple.security.application-groups'] = [...groups, APP_GROUP];
  }
  return cfg;
}

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
        LSHandlerRank:          'Owner',
        LSItemContentTypes:     ['public.json'],
        CFBundleTypeExtensions: ['json'],
      },
    ];
  }
  // Required alongside CFBundleDocumentTypes (Apple warning 90737)
  if (cfg.modResults.LSSupportsOpeningDocumentsInPlace === undefined) {
    cfg.modResults.LSSupportsOpeningDocumentsInPlace = false;
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
  for (const f of ['SproutWatchBridge.h', 'SproutWatchBridge.m', 'SproutiOSShortcuts.swift']) {
    cp(path.join(bridgeSrc, f), path.join(bridgeDst, f));
  }

  // ── iOS widget extension ─────────────────────────────────────────────────
  const bundleId = cfg.ios?.bundleIdentifier ?? 'sprout.richdmart.in';
  const widgetSrc = path.join(projectRoot, 'watch', WIDGET_TARGET);
  const widgetDst = path.join(platformProjectRoot, WIDGET_TARGET);
  mkdirp(widgetDst);
  for (const f of WIDGET_SOURCES) {
    cp(path.join(widgetSrc, f), path.join(widgetDst, f));
  }
  fs.writeFileSync(path.join(widgetDst, 'Info.plist'), widgetInfoPlist('SproutWidget'));
  fs.writeFileSync(path.join(widgetDst, 'SproutWidget.entitlements'), extensionEntitlements(APP_GROUP));

  // ── watchOS widget extension ─────────────────────────────────────────────
  if (WATCH_WIDGET_READY) {
    const watchWidgetSrc = path.join(projectRoot, 'watch', WATCH_WIDGET_TARGET);
    const watchWidgetDst = path.join(platformProjectRoot, WATCH_WIDGET_TARGET);
    mkdirp(watchWidgetDst);
    for (const f of WATCH_WIDGET_SOURCES) {
      cp(path.join(watchWidgetSrc, f), path.join(watchWidgetDst, f));
    }
    fs.writeFileSync(path.join(watchWidgetDst, 'Info.plist'), widgetInfoPlist('SproutWatchWidget'));
    fs.writeFileSync(path.join(watchWidgetDst, 'SproutWatchWidget.entitlements'), extensionEntitlements(APP_GROUP));
  }

  if (!WATCH_READY) return cfg;

  const watchSrc = path.join(projectRoot, 'watch', WATCH_TARGET);
  const watchDst = path.join(platformProjectRoot, WATCH_TARGET);
  mkdirp(watchDst);
  for (const f of SWIFT_SOURCES) {
    cp(path.join(watchSrc, f), path.join(watchDst, f));
  }

  const buildNumber = String(cfg.ios?.buildNumber ?? '1');
  fs.writeFileSync(path.join(watchDst, 'Info.plist'), watchInfoPlist(bundleId, buildNumber));

  // Asset catalog for watch app icon (fixes ASC errors 90391 / 90713).
  // The marketing icon (1024x1024) is required for App Store submission.
  // We reuse the main app icon from assets/icon.png (Expo convention: 1024x1024 PNG).
  const xcassetsDir    = path.join(watchDst, 'Assets.xcassets');
  const appiconsetDir  = path.join(xcassetsDir, 'AppIcon.appiconset');
  mkdirp(appiconsetDir);

  // Complete watchOS icon set. Apple's App Store validator (error 90394/90741)
  // requires the legacy per-role/per-subtype format covering ALL watch sizes and
  // roles (notification center, short look, companion settings) even for modern
  // WKApplication apps. sips resizes the 1024×1024 source to each required px.
  const WATCH_ICON_SIZES = [
    // Companion Settings (appears in the Watch app on paired iPhone; no subtype)
    { px: 58,  filename: 'icon-58.png',  idiom: 'watch', role: 'companionSettings', scale: '2x', size: '29x29' },
    { px: 87,  filename: 'icon-87.png',  idiom: 'watch', role: 'companionSettings', scale: '3x', size: '29x29' },
    // 38mm watch (Series 1–3)
    { px: 48,  filename: 'icon-48.png',  idiom: 'watch', role: 'notificationCenter', scale: '2x', size: '24x24',    subtype: '38mm' },
    { px: 80,  filename: 'icon-80.png',  idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '40x40',    subtype: '38mm' },
    { px: 172, filename: 'icon-172.png', idiom: 'watch', role: 'quickLook',          scale: '2x', size: '86x86',    subtype: '38mm' },
    // 42mm watch (Series 1–3)
    { px: 55,  filename: 'icon-55.png',  idiom: 'watch', role: 'notificationCenter', scale: '2x', size: '27.5x27.5', subtype: '42mm' },
    { px: 88,  filename: 'icon-88.png',  idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '44x44',    subtype: '42mm' },
    { px: 196, filename: 'icon-196.png', idiom: 'watch', role: 'quickLook',          scale: '2x', size: '98x98',    subtype: '42mm' },
    // 40mm watch (Series 4–6) — same home-screen px as 42mm, different subtype
    { px: 88,  filename: 'icon-88.png',  idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '44x44',    subtype: '40mm' },
    // 44mm watch (Series 4–6)
    { px: 100, filename: 'icon-100.png', idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '50x50',    subtype: '44mm' },
    { px: 216, filename: 'icon-216.png', idiom: 'watch', role: 'quickLook',          scale: '2x', size: '108x108',  subtype: '44mm' },
    // 41mm watch (Series 7+)
    { px: 92,  filename: 'icon-92.png',  idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '46x46',    subtype: '41mm' },
    // 45mm watch (Series 7+)
    { px: 102, filename: 'icon-102.png', idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '51x51',    subtype: '45mm' },
    // 49mm watch (Ultra)
    { px: 108, filename: 'icon-108.png', idiom: 'watch', role: 'appLauncher',        scale: '2x', size: '54x54',    subtype: '49mm' },
    // App Store / TestFlight marketing icon (required; without it actool skips the set)
    { px: 1024, filename: 'icon.png',    idiom: 'watch-marketing',                   scale: '1x', size: '1024x1024' },
  ];

  const mainIcon = path.join(projectRoot, 'assets', 'icon.png');
  const { execSync } = require('child_process');
  const generated = new Set();
  for (const entry of WATCH_ICON_SIZES) {
    const dstFile = path.join(appiconsetDir, entry.filename);
    if (generated.has(entry.filename)) continue; // same file referenced by multiple subtypes
    generated.add(entry.filename);
    if (entry.px === 1024) {
      cp(mainIcon, dstFile);
    } else if (process.platform === 'darwin') {
      try {
        execSync(`sips -z ${entry.px} ${entry.px} "${mainIcon}" --out "${dstFile}"`, { stdio: 'pipe' });
      } catch (_) {
        cp(mainIcon, dstFile);
      }
    } else {
      cp(mainIcon, dstFile);
    }
  }

  const iconContents = JSON.stringify({
    images: WATCH_ICON_SIZES.map(entry => {
      const img = { filename: entry.filename, idiom: entry.idiom, scale: entry.scale, size: entry.size };
      if (entry.role) img.role = entry.role;
      if (entry.subtype) img.subtype = entry.subtype;
      return img;
    }),
    info: { author: 'xcode', version: 1 },
  }, null, 2);
  fs.writeFileSync(path.join(appiconsetDir, 'Contents.json'), iconContents);

  // Root Contents.json (required by Xcode for every .xcassets bundle)
  fs.writeFileSync(
    path.join(xcassetsDir, 'Contents.json'),
    JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2),
  );

  // Fallback scheme patch: if by some Expo version the xcodeproj mod ran first,
  // the UUID will be readable here.  The idempotency guard in patchScheme makes
  // this a no-op if modifyProject already patched it.
  const watchTargetUuid = readWatchTargetUuid(platformProjectRoot, projectName);
  if (watchTargetUuid) {
    patchScheme(platformProjectRoot, projectName, watchTargetUuid);
  }

  // EAS only installs provisioning profiles for targets it manages (the main app).
  // Install the watch profile directly into the system store during prebuild so
  // Xcode finds it when looking for PROVISIONING_PROFILE_SPECIFIER = "Sprout Watch".
  installWatchProfile(projectRoot);

  return cfg;
}

// ── Xcode project modifications ───────────────────────────────────────────────
function modifyProject(cfg) {
  const project     = cfg.modResults;
  const bundleId    = cfg.ios?.bundleIdentifier ?? 'sprout.richdmart.in';
  const watchId     = `${bundleId}${WATCH_SUFFIX}`;
  const mainUuid    = project.getFirstTarget().uuid;
  const teamId      = cfg.ios?.teamId;
  // Expo copies scheme files from templates before ANY plugin mod runs,
  // so the scheme file already exists on disk here in the xcodeproj phase.
  const { platformProjectRoot, projectName } = cfg.modRequest;

  // ── STEP 1: Bridge files → main target (fully direct, idempotent) ─────────
  const bridgeGroupKey = project.findPBXGroupKey({ name: 'SproutWatchBridge' });
  if (!bridgeGroupKey) {
    const bridgeGroup = project.addPbxGroup([], 'SproutWatchBridge', 'SproutWatchBridge');
    const hRefId = ensureFileRef(project, 'SproutWatchBridge/SproutWatchBridge.h', 'SproutWatchBridge.h', 'sourcecode.c.h');
    addToGroup(project, hRefId, 'SproutWatchBridge.h', bridgeGroup.uuid);
    const mRefId = ensureFileRef(project, 'SproutWatchBridge/SproutWatchBridge.m', 'SproutWatchBridge.m');
    addToGroup(project, mRefId, 'SproutWatchBridge.m', bridgeGroup.uuid);
    addToSourcesPhase(project, mRefId, 'SproutWatchBridge.m', mainUuid);
    // Swift files in the bridge group
    for (const swiftFile of ['SproutiOSShortcuts.swift']) {
      const swiftRefId = ensureFileRef(project, `SproutWatchBridge/${swiftFile}`, swiftFile);
      addToGroup(project, swiftRefId, swiftFile, bridgeGroup.uuid);
      addToSourcesPhase(project, swiftRefId, swiftFile, mainUuid);
    }
    addFrameworkToTarget(project, 'WatchConnectivity.framework', mainUuid);
  }

  // ── STEP 1b: iOS widget extension ─────────────────────────────────────────
  const allTargets = Object.values(project.pbxNativeTargetSection());

  if (!allTargets.some(t => t.name === WIDGET_TARGET || t.name === `"${WIDGET_TARGET}"`)) {
    const widgetId     = `${bundleId}.${WIDGET_TARGET}`;
    const widgetTarget = project.addTarget(WIDGET_TARGET, 'app_extension', WIDGET_TARGET, widgetId);

    project.addBuildPhase([], 'PBXSourcesBuildPhase',    'Sources',    widgetTarget.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase',  'Resources',  widgetTarget.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', widgetTarget.uuid);

    const widgetGroup = project.addPbxGroup([], WIDGET_TARGET, WIDGET_TARGET);
    for (const f of WIDGET_SOURCES) {
      const fRefId = ensureFileRef(project, `${WIDGET_TARGET}/${f}`, f);
      addToGroup(project, fRefId, f, widgetGroup.uuid);
      addToSourcesPhase(project, fRefId, f, widgetTarget.uuid);
    }
    const wPlistRef = ensureFileRef(project, `${WIDGET_TARGET}/Info.plist`, 'Info.plist', 'text.plist.xml');
    addToGroup(project, wPlistRef, 'Info.plist', widgetGroup.uuid);

    addFrameworkToTarget(project, 'WidgetKit.framework', widgetTarget.uuid);
    addFrameworkToTarget(project, 'SwiftUI.framework',   widgetTarget.uuid);

    const widgetProfileSpecifier = process.env.WIDGET_PROVISIONING_PROFILE;
    applyBuildSettings(project, widgetTarget.uuid, {
      SDKROOT:                   'iphoneos',
      TARGETED_DEVICE_FAMILY:    '"1,2"',
      SWIFT_VERSION:             `"${SWIFT_VER}"`,
      IPHONEOS_DEPLOYMENT_TARGET:`"${IOS_MIN}"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${widgetId}"`,
      INFOPLIST_FILE:            `"${WIDGET_TARGET}/Info.plist"`,
      PRODUCT_NAME:              '"$(TARGET_NAME)"',
      CODE_SIGN_STYLE:           '"Manual"',
      CODE_SIGN_IDENTITY:        '"Apple Distribution"',
      CODE_SIGN_ENTITLEMENTS:    `"${WIDGET_TARGET}/SproutWidget.entitlements"`,
      SKIP_INSTALL:              '"YES"',
      ...(teamId ? { DEVELOPMENT_TEAM: teamId } : {}),
      ...(widgetProfileSpecifier ? { PROVISIONING_PROFILE_SPECIFIER: `"${widgetProfileSpecifier}"` } : {}),
    });

    patchEmbedExtensionPhase(project, mainUuid, widgetTarget, 'ios');
  }

  if (!WATCH_READY) return cfg;

  // ── STEP 2: Watch target (idempotent via target-name check) ───────────────
  if (allTargets.some(t => t.name === WATCH_TARGET || t.name === `"${WATCH_TARGET}"`)) return cfg;

  const watchTarget = project.addTarget(WATCH_TARGET, 'watch2_app', WATCH_TARGET, watchId);

  // addTarget('watch2_app') creates buildPhases:[] with NO Sources/Resources/Frameworks
  // phases for the watch target itself — only "Embed Watch Content" in the parent.
  // Without these, addToSourcesPhase silently returns early and no Swift gets compiled.
  project.addBuildPhase([], 'PBXSourcesBuildPhase',    'Sources',    watchTarget.uuid);
  project.addBuildPhase([], 'PBXResourcesBuildPhase',  'Resources',  watchTarget.uuid);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', watchTarget.uuid);

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

  // For non-EAS CI (e.g. Codemagic): stamp PROVISIONING_PROFILE_SPECIFIER onto
  // the main target so xcodebuild can match the profile without EAS's xcargs injection.
  const mainProfileSpecifier = process.env.MAIN_PROVISIONING_PROFILE;
  if (mainProfileSpecifier) {
    applyBuildSettings(project, mainUuid, {
      CODE_SIGN_STYLE: '"Manual"',
      PROVISIONING_PROFILE_SPECIFIER: `"${mainProfileSpecifier}"`,
    });
  }

  // EAS Fastlane passes PROVISIONING_PROFILE_SPECIFIER only for sdk=iphoneos*
  // targets. The watchos target gets no specifier, so Xcode can't match a profile
  // in manual signing mode. Setting it in the pbxproj here is not overridden by
  // EAS's iphoneos-conditional xcargs, so Xcode uses this value for the watch target.
  const watchProfileSpecifier = process.env.WATCH_PROVISIONING_PROFILE;
  applyBuildSettings(project, watchTarget.uuid, {
    SDKROOT:                   'watchos',
    TARGETED_DEVICE_FAMILY:    '"4"',
    SWIFT_VERSION:             `"${SWIFT_VER}"`,
    WATCHOS_DEPLOYMENT_TARGET: `"${WATCH_OS_MIN}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${watchId}"`,
    INFOPLIST_FILE:            `"${WATCH_TARGET}/Info.plist"`,
    PRODUCT_NAME:              '"$(TARGET_NAME)"',
    CODE_SIGN_STYLE:           '"Manual"',
    // EAS passes CODE_SIGN_IDENTITY only for sdk=iphoneos* via xcargs;
    // the watchos target never gets it, so Xcode falls back to "iPhone Developer".
    // Setting it here makes Xcode use the Distribution cert that EAS imports.
    CODE_SIGN_IDENTITY:        '"Apple Distribution"',
    CODE_SIGNING_REQUIRED:     '"NO"',
    ASSETCATALOG_COMPILER_APPICON_NAME: '"AppIcon"',
    ARCHS:              '"arm64_32 arm64"',
    ONLY_ACTIVE_ARCH:   '"NO"',
    EXCLUDED_ARCHS:     '""',
    ...(teamId ? { DEVELOPMENT_TEAM: teamId } : {}),
    ...(watchProfileSpecifier ? { PROVISIONING_PROFILE_SPECIFIER: `"${watchProfileSpecifier}"` } : {}),
  });

  // ── STEP 6: Patch auto-created embed phase ────────────────────────────────
  // addTarget('watch2_app') already creates "Embed Watch Content" in the main
  // target with SproutWatch.app. We just need to add CodeSignOnCopy to that
  // build file. (Calling a second addBuildPhase would duplicate the phase.)
  patchEmbedPhase(project, mainUuid, watchTarget);

  // ── STEP 6b: Watch widget extension (complication) ────────────────────────
  if (WATCH_WIDGET_READY) {
  const allTargets2 = Object.values(project.pbxNativeTargetSection());
  if (!allTargets2.some(t => t.name === WATCH_WIDGET_TARGET || t.name === `"${WATCH_WIDGET_TARGET}"`)) {
    const watchWidgetId     = `${bundleId}${WATCH_SUFFIX}.${WATCH_WIDGET_TARGET}`;
    const watchWidgetTarget = project.addTarget(WATCH_WIDGET_TARGET, 'app_extension', WATCH_WIDGET_TARGET, watchWidgetId);

    project.addBuildPhase([], 'PBXSourcesBuildPhase',    'Sources',    watchWidgetTarget.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase',  'Resources',  watchWidgetTarget.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', watchWidgetTarget.uuid);

    const wwGroup = project.addPbxGroup([], WATCH_WIDGET_TARGET, WATCH_WIDGET_TARGET);
    for (const f of WATCH_WIDGET_SOURCES) {
      const fRefId = ensureFileRef(project, `${WATCH_WIDGET_TARGET}/${f}`, f);
      addToGroup(project, fRefId, f, wwGroup.uuid);
      addToSourcesPhase(project, fRefId, f, watchWidgetTarget.uuid);
    }
    const wwPlistRef = ensureFileRef(project, `${WATCH_WIDGET_TARGET}/Info.plist`, 'Info.plist', 'text.plist.xml');
    addToGroup(project, wwPlistRef, 'Info.plist', wwGroup.uuid);

    addFrameworkToTarget(project, 'WidgetKit.framework', watchWidgetTarget.uuid);
    addFrameworkToTarget(project, 'SwiftUI.framework',   watchWidgetTarget.uuid);

    const watchWidgetProfile = process.env.WATCH_WIDGET_PROVISIONING_PROFILE;
    applyBuildSettings(project, watchWidgetTarget.uuid, {
      SDKROOT:                    'watchos',
      TARGETED_DEVICE_FAMILY:     '"4"',
      SWIFT_VERSION:              `"${SWIFT_VER}"`,
      WATCHOS_DEPLOYMENT_TARGET:  `"${WATCH_OS_MIN}"`,
      PRODUCT_BUNDLE_IDENTIFIER:  `"${watchWidgetId}"`,
      INFOPLIST_FILE:             `"${WATCH_WIDGET_TARGET}/Info.plist"`,
      PRODUCT_NAME:               '"$(TARGET_NAME)"',
      CODE_SIGN_STYLE:            '"Manual"',
      CODE_SIGN_IDENTITY:         '"Apple Distribution"',
      CODE_SIGN_ENTITLEMENTS:     `"${WATCH_WIDGET_TARGET}/SproutWatchWidget.entitlements"`,
      SKIP_INSTALL:               '"YES"',
      ARCHS:                      '"arm64_32 arm64"',
      ONLY_ACTIVE_ARCH:           '"NO"',
      ...(teamId ? { DEVELOPMENT_TEAM: teamId } : {}),
      ...(watchWidgetProfile ? { PROVISIONING_PROFILE_SPECIFIER: `"${watchWidgetProfile}"` } : {}),
    });

    // Remove the auto-created embed phase from main target, re-create in watch target
    removeAutoEmbedFromMain(project, mainUuid, watchWidgetTarget);
    patchEmbedExtensionPhase(project, watchTarget.uuid, watchWidgetTarget, 'watchos');
  }
  } // end WATCH_WIDGET_READY

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
 * Patch the Xcode scheme so SproutWatch is included in the build action.
 *
 * xcodebuild archive only builds targets explicitly listed in the scheme's
 * <BuildActionEntries> with buildForArchiving="YES".  This adds that entry.
 *
 * Profile-installation note: certs/watch_appstore.mobileprovision is committed to the
 * repo (only .p12 is gitignored), so EAS uploads it as a project file.
 * installWatchProfile() copies it into ~/Library/MobileDevice/Provisioning
 * Profiles/ during PREBUILD, before xcodebuild archive runs.
 * CODE_SIGNING_REQUIRED=NO on the watch target means archive completes even
 * if the profile isn't found; the export step re-signs using the installed
 * profile via export_options.provisioningProfiles.
 */
function patchScheme(platformProjectRoot, projectName, watchTargetUuid) {
  const schemesDir = path.join(
    platformProjectRoot,
    `${projectName}.xcodeproj`,
    'xcshareddata',
    'xcschemes',
  );

  let schemeFile = path.join(schemesDir, `${projectName}.xcscheme`);
  if (!fs.existsSync(schemeFile)) {
    const found = fs.existsSync(schemesDir)
      ? fs.readdirSync(schemesDir).find(f => f.endsWith('.xcscheme'))
      : null;
    if (!found) return;
    schemeFile = path.join(schemesDir, found);
  }

  let xml = fs.readFileSync(schemeFile, 'utf8');

  // Idempotency: if SproutWatch is already in the scheme, leave it alone.
  if (xml.includes('SproutWatch')) return;

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

  if (xml.includes('</BuildActionEntries>')) {
    xml = xml.replace('</BuildActionEntries>', `${entry}\n      </BuildActionEntries>`);
  } else if (xml.includes('<BuildAction')) {
    xml = xml.replace(
      /(<BuildAction\b[^>]*>)/,
      `$1\n      <BuildActionEntries>\n${entry}\n      </BuildActionEntries>`,
    );
  } else {
    return;
  }

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

function installWatchProfile(projectRoot) {
  if (process.platform !== 'darwin') return;
  const profilesDir = path.join(process.env.HOME, 'Library', 'MobileDevice', 'Provisioning Profiles');
  mkdirp(profilesDir);
  const { execSync } = require('child_process');

  const toInstall = [
    'watch_appstore.mobileprovision',
    'widget_appstore.mobileprovision',
    'watch_widget_appstore.mobileprovision',
  ];

  for (const filename of toInstall) {
    const profileSrc = path.join(projectRoot, 'certs', filename);
    if (!fs.existsSync(profileSrc)) continue;
    try {
      const xml  = execSync(`security cms -D -i "${profileSrc}"`, { encoding: 'utf8' });
      const m    = xml.match(/<key>UUID<\/key>\s*<string>([^<]+)<\/string>/);
      if (!m?.[1]) { console.warn(`[withWatchApp] Could not extract UUID from ${filename}`); continue; }
      const uuid = m[1].trim();
      fs.copyFileSync(profileSrc, path.join(profilesDir, `${uuid}.mobileprovision`));
      console.log(`[withWatchApp] Installed profile ${filename} as ${uuid}`);
    } catch (e) {
      console.warn(`[withWatchApp] Failed to install ${filename}:`, e.message);
    }
  }
}

function watchInfoPlist(mainBundleId, buildNumber = '1') {
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
\t<string>${buildNumber}</string>
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

// ── Widget / extension helpers ────────────────────────────────────────────────

function widgetInfoPlist(extensionName) {
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
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.widgetkit-extension</string>
\t</dict>
</dict>
</plist>`;
}

function extensionEntitlements(appGroup) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.security.application-groups</key>
\t<array>
\t\t<string>${appGroup}</string>
\t</array>
</dict>
</plist>`;
}

/**
 * Create or patch an "Embed App Extensions" copy phase in the given parent target
 * to include the extension's product, signed on copy.
 */
function patchEmbedExtensionPhase(project, parentTargetUuid, extTarget, platform) {
  const objs         = project.hash.project.objects;
  const parentTarget = project.pbxNativeTargetSection()[parentTargetUuid];
  if (!parentTarget) return;

  // dstSubfolderSpec 13 = Extensions folder
  const DST_SPEC = 13;
  const PHASE_NAME = '"Embed App Extensions"';

  // Find existing embed-app-extensions phase in this parent, if any
  let embedPhaseUuid = null;
  for (const phaseEntry of (parentTarget.buildPhases || [])) {
    const phase = (objs['PBXCopyFilesBuildPhase'] || {})[phaseEntry.value];
    if (phase && phase.dstSubfolderSpec == DST_SPEC) {
      embedPhaseUuid = phaseEntry.value;
      break;
    }
  }

  if (!embedPhaseUuid) {
    // Create the phase
    embedPhaseUuid = project.generateUuid();
    objs['PBXCopyFilesBuildPhase'] = objs['PBXCopyFilesBuildPhase'] || {};
    objs['PBXCopyFilesBuildPhase'][embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: '2147483647',
      dstPath: '""',
      dstSubfolderSpec: DST_SPEC,
      files: [],
      name: PHASE_NAME,
      runOnlyForDeploymentPostprocessing: '0',
    };
    objs['PBXCopyFilesBuildPhase'][`${embedPhaseUuid}_comment`] = 'Embed App Extensions';
    parentTarget.buildPhases = parentTarget.buildPhases || [];
    parentTarget.buildPhases.push({ value: embedPhaseUuid, comment: 'Embed App Extensions' });
  }

  const embedPhase = objs['PBXCopyFilesBuildPhase'][embedPhaseUuid];
  embedPhase.files = embedPhase.files || [];

  // Get the extension's product file reference
  const nt      = project.pbxNativeTargetSection()[extTarget.uuid];
  const prodRef = nt?.productReference;
  if (!prodRef) return;

  // Duplicate guard
  const alreadyIn = embedPhase.files.some(e => {
    const bf = (objs['PBXBuildFile'] || {})[e.value];
    return bf && bf.fileRef === prodRef;
  });
  if (alreadyIn) return;

  const bfUuid = project.generateUuid();
  const extName = (nt.name || '').replace(/^"|"$/g, '');
  objs['PBXBuildFile'] = objs['PBXBuildFile'] || {};
  objs['PBXBuildFile'][bfUuid] = {
    isa: 'PBXBuildFile',
    fileRef: prodRef,
    fileRef_comment: `${extName}.appex`,
    settings: { ATTRIBUTES: ['CodeSignOnCopy', 'RemoveHeadersOnCopy'] },
  };
  objs['PBXBuildFile'][`${bfUuid}_comment`] = `${extName}.appex in Embed App Extensions`;
  embedPhase.files.push({ value: bfUuid, comment: `${extName}.appex in Embed App Extensions` });
}

/**
 * Remove the auto-created "Embed App Extensions" entry (for the given ext target)
 * from the MAIN app target — addTarget('app_extension') plants it there by default,
 * but the watch widget should be embedded in the watch target instead.
 */
function removeAutoEmbedFromMain(project, mainTargetUuid, extTarget) {
  const objs        = project.hash.project.objects;
  const mainTarget  = project.pbxNativeTargetSection()[mainTargetUuid];
  if (!mainTarget) return;

  const nt      = project.pbxNativeTargetSection()[extTarget.uuid];
  const prodRef = nt?.productReference;
  if (!prodRef) return;

  for (const phaseEntry of (mainTarget.buildPhases || [])) {
    const phase = (objs['PBXCopyFilesBuildPhase'] || {})[phaseEntry.value];
    if (!phase) continue;
    const before = phase.files?.length ?? 0;
    phase.files = (phase.files || []).filter(e => {
      const bf = (objs['PBXBuildFile'] || {})[e.value];
      return !(bf && bf.fileRef === prodRef);
    });
    if (phase.files.length < before) return; // found and removed
  }
}
