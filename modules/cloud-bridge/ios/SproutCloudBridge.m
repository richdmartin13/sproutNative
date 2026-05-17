#import "SproutCloudBridge.h"
#import <React/RCTLog.h>

@implementation SproutCloudBridge {
    BOOL _hasListeners;
}

RCT_EXPORT_MODULE(SproutCloudBridge);
+ (BOOL)requiresMainQueueSetup { return NO; }

- (NSArray<NSString *> *)supportedEvents { return @[]; }
- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO;  }

// ── Save JSON to iCloud Documents ─────────────────────────────────────────────

RCT_EXPORT_METHOD(saveToCloud:(NSString *)json
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSURL *fileURL = [self iCloudFileURL];
    if (!fileURL) {
        // iCloud not configured — fail silently
        resolve(nil);
        return;
    }
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSError *err;
        [json writeToURL:fileURL atomically:YES encoding:NSUTF8StringEncoding error:&err];
        if (err) { reject(@"WRITE_ERROR", err.localizedDescription, err); }
        else      { resolve(nil); }
    });
}

// ── Load JSON from iCloud Documents ──────────────────────────────────────────

RCT_EXPORT_METHOD(loadFromCloud:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSURL *fileURL = [self iCloudFileURL];
    if (!fileURL) { resolve(nil); return; }
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSError *err;
        NSString *json = [NSString stringWithContentsOfURL:fileURL
                                                  encoding:NSUTF8StringEncoding
                                                     error:&err];
        resolve(err ? nil : json);
    });
}

// ── iCloud availability check ─────────────────────────────────────────────────

RCT_EXPORT_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSURL *containerURL = [[NSFileManager defaultManager]
                           URLForUbiquityContainerIdentifier:nil];
    resolve(@(containerURL != nil));
}

// ── Helper ────────────────────────────────────────────────────────────────────

- (nullable NSURL *)iCloudFileURL {
    NSFileManager *fm = [NSFileManager defaultManager];
    NSURL *containerURL = [fm URLForUbiquityContainerIdentifier:nil];
    if (!containerURL) return nil;
    NSURL *docsURL = [containerURL URLByAppendingPathComponent:@"Documents"];
    NSError *err;
    [fm createDirectoryAtURL:docsURL
 withIntermediateDirectories:YES
                  attributes:nil
                       error:&err];
    return [docsURL URLByAppendingPathComponent:@"sprout_data.json"];
}

@end
