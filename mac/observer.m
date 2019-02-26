#import <Foundation/Foundation.h>
#import <Carbon/Carbon.h>

void currentInput() {
    TISInputSourceRef source = TISCopyCurrentKeyboardInputSource();
    NSArray* langs = (NSArray*) TISGetInputSourceProperty(source, kTISPropertyInputSourceLanguages);
    NSString* lang = (NSString*) [langs objectAtIndex:0];
    CFStringRef sourceId = (CFStringRef) TISGetInputSourceProperty(source, kTISPropertyInputSourceID);

    fprintf(stdout, "%s %s\n", [lang UTF8String], [(NSString *)sourceId UTF8String]);
}

void notificationCallback (CFNotificationCenterRef center, void * observer, CFStringRef name, const void * object, CFDictionaryRef userInfo) {
    currentInput();
}

int main(int argc, const char * argv[]) {
    currentInput();
    CFNotificationCenterRef center =  CFNotificationCenterGetDistributedCenter();
    CFNotificationCenterAddObserver(center, NULL, notificationCallback,
                                    kTISNotifySelectedKeyboardInputSourceChanged, NULL,
                                    CFNotificationSuspensionBehaviorDeliverImmediately);
    CFRunLoopRun();
    return 0;
}
