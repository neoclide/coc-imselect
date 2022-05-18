//
//  im-select
//
//  Created by Ying Bian on 8/21/12.
//  Copyright (c) 2012 Ying Bian. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Carbon/Carbon.h>

int main(int argc, const char * argv[]) {
    int ret = 0;
    @autoreleasepool {
        if (argc > 1) {
            NSString *inputSource = [NSString stringWithUTF8String:argv[1]];
            NSDictionary *filter = [NSDictionary dictionaryWithObject:inputSource forKey:(NSString *)kTISPropertyInputSourceID];
            CFArrayRef keyboards = TISCreateInputSourceList((__bridge CFDictionaryRef)filter, false);
            if (keyboards) {
                TISInputSourceRef selected = (TISInputSourceRef)CFArrayGetValueAtIndex(keyboards, 0);
                ret = TISSelectInputSource(selected);
                CFRelease(keyboards);
            } else {
                ret = 1;
            }
        } else {
            TISInputSourceRef currentInputSource = TISCopyCurrentKeyboardInputSource();
            NSString *sourceId = (__bridge NSString *)(TISGetInputSourceProperty(currentInputSource, kTISPropertyInputSourceID));
            printf("%s\n", [sourceId UTF8String]);
            CFRelease(currentInputSource);
        }
    }
    return ret;
}
