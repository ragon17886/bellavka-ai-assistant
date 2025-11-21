import React, { useState, useEffect } from 'react';
import { getAssistants, createAssistant } from '../utils/api';

function AssistantsPage() {
  const [assistants, setAssistants] = useState([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Загружаем ассистентов
      const assistantsResponse = await fetch('https://bellavka-ai-assistant-worker.ragon17886.workers.dev/api/admin/assistants');
      const assistantsData = await assistantsResponse.json();
      setAssistants(assistantsData);

      // Загружаем статистику
      const statsResponse = await fetch('https://bellavka-ai-assistant-worker.ragon17886.workers.dev/api/admin/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

    } catch (err) {
      setError('Ошибка загрузки: ' + err.message);
      console.error('API Error:', err);
    }
  };

  const testCreateAssistant = async () => {
    try {
      const response = await fetch('https://bellavka-ai-assistant-worker.ragon17886.workers.dev/api/admin/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Тестовый ассистент',
          type: 'ai',
          system_prompt: 'Ты тестовый ассистент',
          is_active: true
        })
      });
      
      const result = await response.json();
      console.log('Create result:', result);
      loadData(); // Перезагружаем данные
      
    } catch (err) {
      setError('Ошибка создания: ' + err.message);
    }
  };

  return (
    <div>
      <h2>Ассистенты - Отладка</h2>
      
      {error && <div style={{color: 'red'}}>{error}</div>}
      
      <div style={{background: '#f0f0f0', padding: '15px', margin: '10px 0'}}>
        <h3>Статистика БД:</h3>
        <p>Пользователи: {stats.users || 0}</p>
        <p>Диалоги: {stats.dialogs || 0}</p>
        <p>Ассистенты: {stats.assistants || 0}</p>
        <button onClick={loadData}>Обновить статистику</button>
      </div>

      <button onClick={testCreateAssistant} style={{background: '#4CAF50', color: 'white', padding: '10px'}}>
        Создать тестового ассистента
      </button>

      <h3>Список ассистентов ({assistants.length}):</h3>
      <pre>{JSON.stringify(assistants, null, 2)}</pre>
    </div>
  );
}

export default AssistantsPage;