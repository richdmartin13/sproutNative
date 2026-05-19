#import "SproutWatchBridge.h"

static NSString *const kAppGroup = @"group.sprout.richdmart.in";

@implementation SproutWatchBridge {
    BOOL    _hasListeners;
    NSData *_latestPayload;
}

// ── React Native registration ──────────────────────────────────────────────────

RCT_EXPORT_MODULE(SproutWatchBridge);

+ (BOOL)requiresMainQueueSetup { return NO; }

- (NSArray<NSString *> *)supportedEvents {
    return @[@"WatchLog", @"WatchUndo", @"WatchResist", @"WatchReachability", @"WatchPrefUpdate"];
}

- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO;  }

// ── Init: start WCSession ──────────────────────────────────────────────────────

- (instancetype)init {
    self = [super init];
    if (self && [WCSession isSupported]) {
        WCSession.defaultSession.delegate = self;
        [WCSession.defaultSession activateSession];
    }
    return self;
}

// ── JS-callable method ─────────────────────────────────────────────────────────

/// Called from JS with a JSON string of the current habits array and optional watch prefs.
/// Pushes via Application Context (background-safe) and direct message (instant).
RCT_EXPORT_METHOD(sendHabits:(NSString *)habitsJSON prefs:(NSString *)prefsJSON) {
    NSData *data = [habitsJSON dataUsingEncoding:NSUTF8StringEncoding];
    if (!data) return;
    _latestPayload = data;

    // Write to App Group so the iOS widget and Siri shortcut can read it.
    NSUserDefaults *shared = [[NSUserDefaults alloc] initWithSuiteName:kAppGroup];
    if (shared) {
        [shared setObject:data forKey:@"sprout_habits"];
        [shared setDouble:[NSDate date].timeIntervalSince1970 forKey:@"sprout_updated_at"];
    }

    NSMutableDictionary *ctx = [NSMutableDictionary dictionaryWithObject:data forKey:@"habits"];
    if (prefsJSON) {
        NSData *pd = [prefsJSON dataUsingEncoding:NSUTF8StringEncoding];
        if (pd) ctx[@"watchPrefs"] = pd;
    }
    [WCSession.defaultSession updateApplicationContext:ctx error:nil];
    if (WCSession.defaultSession.isReachable) {
        [WCSession.defaultSession sendMessage:ctx replyHandler:nil errorHandler:nil];
    }
}

// ── Private helper ─────────────────────────────────────────────────────────────

- (void)emitName:(NSString *)name body:(id)body {
    if (_hasListeners) [self sendEventWithName:name body:body];
}

// ── WCSessionDelegate ──────────────────────────────────────────────────────────

- (void)session:(WCSession *)session
activationDidCompleteWithState:(WCSessionActivationState)state
          error:(nullable NSError *)error {
    [self emitName:@"WatchReachability" body:@{@"reachable": @(session.isReachable)}];
}

- (void)sessionReachabilityDidChange:(WCSession *)session {
    [self emitName:@"WatchReachability" body:@{@"reachable": @(session.isReachable)}];
}

- (void)sessionDidBecomeInactive:(WCSession *)session {}

- (void)sessionDidDeactivate:(WCSession *)session {
    [WCSession.defaultSession activateSession];
}

/// Watch sent a message that requires a reply (getHabits / logHabit).
- (void)session:(WCSession *)session
didReceiveMessage:(NSDictionary<NSString *, id> *)message
   replyHandler:(void (^)(NSDictionary<NSString *, id> *replyMessage))replyHandler {
    NSString *action = message[@"action"];
    if ([action isEqualToString:@"getHabits"]) {
        replyHandler(_latestPayload ? @{@"habits": _latestPayload} : @{});
    } else if ([action isEqualToString:@"logHabit"] && message[@"id"]) {
        [self emitName:@"WatchLog" body:@{@"id": message[@"id"]}];
        replyHandler(@{@"ok": @YES});
    } else if ([action isEqualToString:@"undoHabit"] && message[@"id"]) {
        [self emitName:@"WatchUndo" body:@{@"id": message[@"id"]}];
        replyHandler(@{@"ok": @YES});
    } else if ([action isEqualToString:@"resistHabit"] && message[@"id"]) {
        [self emitName:@"WatchResist" body:@{@"id": message[@"id"]}];
        replyHandler(@{@"ok": @YES});
    } else if ([action isEqualToString:@"updatePref"] && message[@"key"] && message[@"value"]) {
        [self emitName:@"WatchPrefUpdate" body:@{@"key": message[@"key"], @"value": message[@"value"]}];
        replyHandler(@{@"ok": @YES});
    } else {
        replyHandler(@{});
    }
}

/// Watch sent a fire-and-forget log (no reply needed).
- (void)session:(WCSession *)session
didReceiveMessage:(NSDictionary<NSString *, id> *)message {
    NSString *habitId = message[@"id"];
    if (habitId) [self emitName:@"WatchLog" body:@{@"id": habitId}];
}

@end
