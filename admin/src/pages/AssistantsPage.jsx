import React, { useState, useEffect } from 'react';
import { getAssistants, createAssistant } from '../utils/api';

function AssistantsPage() {
  const [assistants, setAssistants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newAssistant, setNewAssistant] = useState({
    name: '',
    type: 'ai',
    system_prompt: '',
    tov_snippet: '',
    handoff_rules: '',
    is_active: true
  });

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    const data = await getAssistants();
    setAssistants(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createAssistant(newAssistant);
    setShowForm(false);
    setNewAssistant({
      name: '',
      type: 'ai',
      system_prompt: '',
      tov_snippet: '',
      handoff_rules: '',
      is_active: true
    });
    loadAssistants();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Ассистенты</h2>
        <button onClick={() => setShowForm(true)}>Добавить ассистента</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="assistant-form">
          <input
            type="text"
            placeholder="Название"
            value={newAssistant.name}
            onChange={(e) => setNewAssistant({...newAssistant, name: e.target.value})}
            required
          />
          <select
            value={newAssistant.type}
            onChange={(e) => setNewAssistant({...newAssistant, type: e.target.value})}
          >
            <option value="ai">AI</option>
            <option value="function">Function</option>
          </select>
          <textarea
            placeholder="Системный промпт"
            value={newAssistant.system_prompt}
            onChange={(e) => setNewAssistant({...newAssistant, system_prompt: e.target.value})}
            required
            rows="6"
          />
          <textarea
            placeholder="TOV сниппет"
            value={newAssistant.tov_snippet}
            onChange={(e) => setNewAssistant({...newAssistant, tov_snippet: e.target.value})}
            rows="3"
          />
          <textarea
            placeholder="Правила передачи"
            value={newAssistant.handoff_rules}
            onChange={(e) => setNewAssistant({...newAssistant, handoff_rules: e.target.value})}
            rows="3"
          />
          <div>
            <button type="submit">Создать</button>
            <button type="button" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </form>
      )}

      <div className="assistants-grid">
        {assistants.map(assistant => (
          <div key={assistant.id} className="assistant-card">
            <h3>{assistant.name}</h3>
            <p><strong>Тип:</strong> {assistant.type}</p>
            <p><strong>Статус:</strong> {assistant.is_active ? 'Активен' : 'Неактивен'}</p>
            <div className="prompt-preview">
              {assistant.system_prompt.substring(0, 100)}...
            </div>
            <p><small>Создан: {new Date(assistant.created_at).toLocaleDateString()}</small></p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AssistantsPage;