#import "SproutWatchBridge.h"

@implementation SproutWatchBridge {
    BOOL    _hasListeners;
    NSData *_latestPayload;
}

// ── React Native registration ──────────────────────────────────────────────────

RCT_EXPORT_MODULE(SproutWatchBridge);

+ (BOOL)requiresMainQueueSetup { return NO; }

- (NSArray<NSString *> *)supportedEvents {
    return @[@"WatchLog", @"WatchReachability"];
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

/// Called from JS with a JSON string of the current habits array.
/// Pushes via Application Context (background-safe) and direct message (instant).
RCT_EXPORT_METHOD(sendHabits:(NSString *)habitsJSON) {
    NSData *data = [habitsJSON dataUsingEncoding:NSUTF8StringEncoding];
    if (!data) return;
    _latestPayload = data;
    [WCSession.defaultSession updateApplicationContext:@{@"habits": data} error:nil];
    if (WCSession.defaultSession.isReachable) {
        [WCSession.defaultSession sendMessage:@{@"habits": data}
                                 replyHandler:nil
                                 errorHandler:nil];
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
