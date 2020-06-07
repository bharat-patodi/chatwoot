import AuthAPI from '../api/auth';
import BaseActionCableConnector from '../../shared/helpers/BaseActionCableConnector';

class ActionCableConnector extends BaseActionCableConnector {
  constructor(app, pubsubToken) {
    super(app, pubsubToken);
    this.CancelTyping = [];
    this.events = {
      'message.created': this.onMessageCreated,
      'message.updated': this.onMessageUpdated,
      'conversation.created': this.onConversationCreated,
      'conversation.opened': this.onStatusChange,
      'conversation.resolved': this.onStatusChange,
      'user:logout': this.onLogout,
      'page:reload': this.onReload,
      'assignee.changed': this.onAssigneeChanged,
      'conversation.typing_on': this.onTypingOn,
      'conversation.typing_off': this.onTypingOff,
      'conversation.contact_changed': this.onConversationContactChange,
    };
  }

  isAValidEvent = data => {
    return this.app.$store.getters.getCurrentAccountId === data.account_id;
  };

  onMessageUpdated = data => {
    this.app.$store.dispatch('messages/addMessage', data);
  };

  onConversationContactChange = payload => {
    this.app.$store.dispatch('updateConversation', payload);
    const { meta = {} } = payload;
    const { sender } = meta || {};
    this.app.$store.dispatch('setContact', sender);
  };

  onConversationCreated = data => {
    this.app.$store.dispatch('addConversation', data);
  };

  onLogout = () => AuthAPI.logout();

  onMessageCreated = data => {
    this.app.$store.dispatch('messages/addMessage', data);
  };

  onReload = () => window.location.reload();

  onStatusChange = data => {
    this.app.$store.dispatch('updateConversation', data);
  };

  onAssigneeChanged = payload => {
    this.app.$store.dispatch('updateConversation', payload);
  };

  onTypingOn = ({ conversation, user }) => {
    const conversationId = conversation.id;

    this.clearTimer(conversationId);
    this.app.$store.dispatch('conversationTypingStatus/create', {
      conversationId,
      user,
    });
    this.initTimer({ conversation, user });
  };

  onTypingOff = ({ conversation, user }) => {
    const conversationId = conversation.id;

    this.clearTimer(conversationId);
    this.app.$store.dispatch('conversationTypingStatus/destroy', {
      conversationId,
      user,
    });
  };

  clearTimer = conversationId => {
    const timerEvent = this.CancelTyping[conversationId];

    if (timerEvent) {
      clearTimeout(timerEvent);
      this.CancelTyping[conversationId] = null;
    }
  };

  initTimer = ({ conversation, user }) => {
    const conversationId = conversation.id;
    // Turn off typing automatically after 30 seconds
    this.CancelTyping[conversationId] = setTimeout(() => {
      this.onTypingOff({ conversation, user });
    }, 30000);
  };
}

export default {
  init() {
    if (AuthAPI.isLoggedIn()) {
      const actionCable = new ActionCableConnector(
        window.WOOT,
        AuthAPI.getPubSubToken()
      );
      return actionCable;
    }
    return null;
  },
};
