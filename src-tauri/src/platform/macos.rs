//! macOS idle sensing through Quartz. This queries the aggregate time since
//! the last input event; it does not install an event tap or inspect input.
//! Fullscreen detection remains unavailable without Accessibility access.

use super::PlatformCapabilities;

const COMBINED_SESSION_STATE: u32 = 0;
const ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;

#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: u32, event_type: u32) -> f64;
}

fn seconds_to_idle(seconds: f64) -> Option<u64> {
    (seconds.is_finite() && seconds >= 0.0).then(|| seconds.floor() as u64)
}

pub fn idle_secs() -> Option<u64> {
    let seconds = unsafe {
        CGEventSourceSecondsSinceLastEventType(COMBINED_SESSION_STATE, ANY_INPUT_EVENT_TYPE)
    };
    seconds_to_idle(seconds)
}

pub fn fullscreen_active() -> bool {
    false
}

pub fn capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: "macos".to_string(),
        idle_supported: idle_secs().is_some(),
        fullscreen_supported: false,
    }
}

#[cfg(test)]
mod tests {
    use super::seconds_to_idle;

    #[test]
    fn idle_seconds_rejects_invalid_quartz_values() {
        assert_eq!(seconds_to_idle(10.9), Some(10));
        assert_eq!(seconds_to_idle(0.0), Some(0));
        assert_eq!(seconds_to_idle(-1.0), None);
        assert_eq!(seconds_to_idle(f64::NAN), None);
        assert_eq!(seconds_to_idle(f64::INFINITY), None);
    }
}
