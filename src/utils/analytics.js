export class Analytics {
    constructor() {
        this.gtag = window.gtag || function() {};
        this.isInitialized = typeof window.gtag === 'function';
        this.sessionStartTime = Date.now();
        this.interactionCount = 0;
    }

    sendEvent(eventName, parameters = {}) {
        if (!this.isInitialized) return;
        
        this.gtag('event', eventName, {
            event_category: parameters.category || 'engagement',
            event_label: parameters.label,
            value: parameters.value,
            ...parameters.custom
        });
    }

    trackPageView(pageName) {
        this.sendEvent('page_view', {
            category: 'navigation',
            label: pageName,
            custom: {
                page_title: pageName,
                page_location: window.location.href
            }
        });
    }

    trackDevice(deviceInfo) {
        const deviceData = {
            device_type: deviceInfo.deviceType || 'unknown',
            device_brand: deviceInfo.deviceInfo?.device?.brand || 'unknown',
            device_model: deviceInfo.deviceInfo?.device?.model || 'unknown',
            os_name: deviceInfo.deviceInfo?.os?.name || 'unknown',
            os_version: deviceInfo.deviceInfo?.os?.version || 'unknown',
            browser_name: deviceInfo.deviceInfo?.client?.name || 'unknown',
            browser_version: deviceInfo.deviceInfo?.client?.version || 'unknown',
            is_bot: deviceInfo.isBot ? 'true' : 'false',
            has_touch: deviceInfo.hasTouch ? 'true' : 'false',
            has_mouse: deviceInfo.hasMouse ? 'true' : 'false',
            has_keyboard: deviceInfo.hasKeyboard ? 'true' : 'false',
            is_touch_only: deviceInfo.isTouchOnly ? 'true' : 'false'
        };

        this.sendEvent('device_info', {
            category: 'system',
            label: deviceData.device_type,
            custom: deviceData
        });
    }

    trackAchievement(achievementName, achievementDescription) {
        this.sendEvent('unlock_achievement', {
            category: 'achievement',
            label: achievementName,
            value: 1,
            custom: {
                achievement_id: achievementName,
                description: achievementDescription
            }
        });
    }

    trackInteraction(objectName, interactionType = 'click') {
        this.interactionCount++;
        
        this.sendEvent('3d_interaction', {
            category: 'engagement',
            label: objectName,
            value: this.interactionCount,
            custom: {
                interaction_type: interactionType,
                object_name: objectName,
                interaction_number: this.interactionCount
            }
        });
    }

    trackSessionTime() {
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        
        this.sendEvent('session_duration', {
            category: 'engagement',
            label: 'time_spent',
            value: sessionDuration,
            custom: {
                duration_seconds: sessionDuration,
                duration_formatted: this.formatTime(sessionDuration)
            }
        });
    }

    trackLoadTime(loadTimeMs) {
        this.sendEvent('performance_timing', {
            category: 'performance',
            label: 'scene_load',
            value: loadTimeMs,
            custom: {
                load_time_ms: loadTimeMs,
                load_time_seconds: (loadTimeMs / 1000).toFixed(2)
            }
        });
    }

    trackError(errorMessage, errorSource = 'unknown') {
        this.sendEvent('exception', {
            category: 'error',
            label: errorSource,
            custom: {
                description: errorMessage,
                fatal: false
            }
        });
    }

    trackExternalLink(linkName, linkUrl) {
        this.sendEvent('external_link', {
            category: 'engagement',
            label: linkName,
            custom: {
                link_url: linkUrl,
                link_name: linkName
            }
        });
    }

    trackProgress(discoveredCount, totalCount) {
        const progressPercentage = Math.round((discoveredCount / totalCount) * 100);
        
        this.sendEvent('exploration_progress', {
            category: 'engagement',
            label: `${discoveredCount}/${totalCount}`,
            value: progressPercentage,
            custom: {
                discovered: discoveredCount,
                total: totalCount,
                percentage: progressPercentage
            }
        });
    }

    trackMusicToggle(isPlaying) {
        this.sendEvent('music_toggle', {
            category: 'engagement',
            label: isPlaying ? 'play' : 'pause',
            value: isPlaying ? 1 : 0,
            custom: {
                action: isPlaying ? 'started' : 'stopped'
            }
        });
    }

    trackNavigationButton(buttonName) {
        this.sendEvent('navigation_button', {
            category: 'navigation',
            label: buttonName,
            custom: {
                button_name: buttonName
            }
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

export const analytics = new Analytics();