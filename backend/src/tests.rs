#[cfg(test)]
mod rate_limit_tests {
    use crate::state::TestFixture;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn allows_first_message() {
        let f = TestFixture::default();
        assert!(f.rate_limiter.check_device("device_1"));
    }

    #[test]
    fn blocks_rapid_fire_messages() {
        let f = TestFixture::default();
        let device = "rapid_device";

        assert!(f.rate_limiter.check_device(device));
        assert!(!f.rate_limiter.check_device(device));
    }

    #[test]
    fn allows_message_after_interval() {
        let f = TestFixture::default();
        let device = "slow_device";

        assert!(f.rate_limiter.check_device(device));
        thread::sleep(Duration::from_millis(150));
        assert!(f.rate_limiter.check_device(device));
    }

    #[test]
    fn blocks_after_window_limit() {
        let f = TestFixture::default();
        let device = "spam_device";

        // MAX_MESSAGES_PER_WINDOW = 300
        for i in 0..300 {
            f.rate_limiter.reset_interval_for(device);
            assert!(
                f.rate_limiter.check_device(device),
                "message {} should be allowed",
                i + 1
            );
        }

        f.rate_limiter.reset_interval_for(device);
        assert!(
            !f.rate_limiter.check_device(device),
            "message 301 should be blocked"
        );
    }

    #[test]
    fn different_devices_are_independent() {
        let f = TestFixture::default();

        assert!(f.rate_limiter.check_device("device_a"));
        assert!(f.rate_limiter.check_device("device_b"));
        assert!(!f.rate_limiter.check_device("device_a"));

        thread::sleep(Duration::from_millis(150));
        assert!(f.rate_limiter.check_device("device_b"));
    }
}

#[cfg(test)]
mod history_tests {
    use crate::protocol::ClipboardMessage;
    use crate::state::TestFixture;
    use uuid::Uuid;

    fn clipboard(device_id: &str, content: impl Into<String>) -> ClipboardMessage {
        ClipboardMessage::new(device_id, None, content, "nonce")
    }

    #[test]
    fn adds_to_history() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        f.sync
            .add_to_history(user_id, clipboard("device_1", "Hello"));

        let history = f.sync.get_history(&user_id);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].content, "Hello");
    }

    #[test]
    fn history_newest_first() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        f.sync.add_to_history(user_id, clipboard("d1", "First"));
        f.sync.add_to_history(user_id, clipboard("d1", "Second"));
        f.sync.add_to_history(user_id, clipboard("d1", "Third"));

        let history = f.sync.get_history(&user_id);
        assert_eq!(history.len(), 3);
        assert_eq!(history[0].content, "Third");
        assert_eq!(history[1].content, "Second");
        assert_eq!(history[2].content, "First");
    }

    #[test]
    fn history_truncates_at_50() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        for i in 0..60 {
            f.sync
                .add_to_history(user_id, clipboard("d1", format!("msg_{}", i)));
        }

        let history = f.sync.get_history(&user_id);
        assert_eq!(history.len(), 50);
        assert_eq!(history[0].content, "msg_59");
        assert_eq!(history[49].content, "msg_10");
    }

    #[test]
    fn empty_history_for_unknown_user() {
        let f = TestFixture::default();
        assert!(f.sync.get_history(&Uuid::new_v4()).is_empty());
    }

    #[test]
    fn users_have_separate_histories() {
        let f = TestFixture::default();
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();

        f.sync
            .add_to_history(user_a, clipboard("d1", "User A message"));
        f.sync
            .add_to_history(user_b, clipboard("d2", "User B message"));

        let history_a = f.sync.get_history(&user_a);
        let history_b = f.sync.get_history(&user_b);

        assert_eq!(history_a.len(), 1);
        assert_eq!(history_b.len(), 1);
        assert_eq!(history_a[0].content, "User A message");
        assert_eq!(history_b[0].content, "User B message");
    }
}

#[cfg(test)]
mod models_tests {
    use crate::protocol::{ClipboardFrame, ClipboardMessage, HandshakeMessage, ServerMessage};

    #[test]
    fn clipboard_message_new_sets_defaults() {
        let msg = ClipboardMessage::new("device_123", None, "test content", "nonce_123");

        assert_eq!(msg.device_id, "device_123");
        assert_eq!(msg.content, "test content");
        assert_eq!(msg.nonce, "nonce_123");
        assert!(msg.timestamp > 0);
    }

    #[test]
    fn clipboard_message_accepts_string_and_str() {
        let msg1 = ClipboardMessage::new("device", None, "content", "nonce");
        let msg2 = ClipboardMessage::new(
            String::from("device"),
            None,
            String::from("content"),
            String::from("nonce"),
        );

        assert_eq!(msg1.device_id, msg2.device_id);
        assert_eq!(msg1.content, msg2.content);
    }

    #[test]
    fn typed_protocol_serializes_clipboard_frame() {
        let frame = ServerMessage::Clipboard(ClipboardFrame::history(ClipboardMessage::new(
            "device",
            Some("Laptop".into()),
            "ciphertext",
            "nonce",
        )));

        let json = serde_json::to_string(&frame).unwrap();
        assert!(json.contains("\"type\":\"clipboard\""));
        assert!(json.contains("\"is_history\":true"));
    }

    #[test]
    fn typed_protocol_serializes_handshake_variant() {
        let handshake = serde_json::to_value(crate::protocol::ClientMessage::Handshake(
            HandshakeMessage::new("device", Some("Phone".into())),
        ))
        .unwrap();

        assert_eq!(handshake["type"], "handshake");
        assert_eq!(handshake["device_id"], "device");
    }
}

#[cfg(test)]
mod channel_tests {
    use crate::state::TestFixture;
    use uuid::Uuid;

    #[test]
    fn creates_new_channel() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        assert!(!f.sync.channel_exists(&user_id));
        let _tx = f.sync.get_or_create_channel(user_id);
        assert!(f.sync.channel_exists(&user_id));
    }

    #[test]
    fn reuses_existing_channel() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        let tx1 = f.sync.get_or_create_channel(user_id);
        let tx2 = f.sync.get_or_create_channel(user_id);

        assert_eq!(tx1.receiver_count(), tx2.receiver_count());
    }

    #[test]
    fn cleanup_removes_empty_channel() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        let tx = f.sync.get_or_create_channel(user_id);
        assert!(f.sync.channel_exists(&user_id));

        f.sync.cleanup_channel_if_empty(&user_id, &tx);
        assert!(!f.sync.channel_exists(&user_id));
    }

    #[test]
    fn cleanup_keeps_channel_with_subscribers() {
        let f = TestFixture::default();
        let user_id = Uuid::new_v4();

        let tx = f.sync.get_or_create_channel(user_id);
        let _rx = tx.subscribe();

        f.sync.cleanup_channel_if_empty(&user_id, &tx);
        assert!(f.sync.channel_exists(&user_id));
    }
}
