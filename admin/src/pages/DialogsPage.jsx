import React, { useState, useEffect } from 'react';
import { getDialogs, getUserDialogs } from '../utils/api';

function DialogsPage() {
  const [dialogs, setDialogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDialogs, setUserDialogs] = useState([]);

  useEffect(() => {
    loadDialogs();
  }, []);

  const loadDialogs = async () => {
    const data = await getDialogs();
    setDialogs(data);
  };

  const loadUserDialogs = async (tgId) => {
    const data = await getUserDialogs(tgId);
    setUserDialogs(data);
    setSelectedUser(tgId);
  };

  // Группируем диалоги по пользователям
  const usersMap = dialogs.reduce((acc, dialog) => {
    if (!acc[dialog.tg_id]) {
      acc[dialog.tg_id] = {
        tg_id: dialog.tg_id,
        full_name: dialog.full_name || 'Неизвестный',
        last_activity: dialog.timestamp,
        message_count: 0
      };
    }
    acc[dialog.tg_id].message_count++;
    if (new Date(dialog.timestamp) > new Date(acc[dialog.tg_id].last_activity)) {
      acc[dialog.tg_id].last_activity = dialog.timestamp;
    }
    return acc;
  }, {});

  const users = Object.values(usersMap).sort((a, b) => 
    new Date(b.last_activity) - new Date(a.last_activity)
  );

  return (
    <div className="dialogs-page">
      <h2>Диалоги</h2>
      
      <div className="dialogs-layout">
        <div className="users-list">
          <h3>Пользователи ({users.length})</h3>
          {users.map(user => (
            <div 
              key={user.tg_id} 
              className={`user-item ${selectedUser === user.tg_id ? 'active' : ''}`}
              onClick={() => loadUserDialogs(user.tg_id)}
            >
              <div className="user-name">{user.full_name}</div>
              <div className="user-info">
                <span>Сообщений: {user.message_count}</span>
                <span>Активен: {new Date(user.last_activity).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="dialog-content">
          {selectedUser ? (
            <div>
              <h3>Диалог с {usersMap[selectedUser]?.full_name}</h3>
              <div className="messages">
                {userDialogs.map(dialog => (
                  <div key={dialog.id} className={`message ${dialog.role}`}>
                    <div className="message-header">
                      <strong>{dialog.role === 'user' ? 'Пользователь' : 'Ассистент'}</strong>
                      <span>{new Date(dialog.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="message-content">{dialog.content}</div>
                    {dialog.metadata && (
                      <div className="message-metadata">
                        Metadata: {dialog.metadata}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Выберите пользователя для просмотра диалога</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DialogsPage;