#pragma once
// Specific #imports (not @import React) — React-Core pod headers are non-modular;
// Clang's @import would fail with -Wnon-modular-include-in-framework-module.
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@import WatchConnectivity;

NS_ASSUME_NONNULL_BEGIN

/// React Native event emitter that owns the WCSession for the main iOS app.
/// JS calls sendHabits(_:) to push data to the watch.
/// Watch log-taps are forwarded to JS via the "WatchLog" event.
@interface SproutWatchBridge : RCTEventEmitter <WCSessionDelegate>
@end

NS_ASSUME_NONNULL_END
