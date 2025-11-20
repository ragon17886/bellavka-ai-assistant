// В обработчике текстового сообщения замените:
if (text) {
    // Получаем историю диалогов для контекста
    const history = await dbService.getDialogHistory(user.tg_id, 6);
    
    // Системный промпт для ассистента
    const systemInstruction = `Ты — AI-ассистент Bellavka. Твой стиль общения — вежливый, дружелюбный, но профессиональный.
Отвечай на вопросы о товарах и услугах Bellavka. Если не знаешь ответа, вежливо предложи уточнить вопрос или обратиться к менеджеру.
Будь кратким и полезным.`;

    // Используем быстрый ответ без истории (пока не настроена БД)
    const geminiService = new GeminiService(env);
    let responseText: string;
    
    if (history.length > 0) {
        responseText = await geminiService.generateTextResponse(systemInstruction, history);
    } else {
        // Если истории нет, используем быстрый ответ
        responseText = await geminiService.generateQuickResponse(text, systemInstruction);
    }

    // Логируем ответ ассистента
    await dbService.logDialog(user.tg_id, 'assistant', responseText);

    // Отправляем ответ пользователю
    await sendMessage(chatId, responseText, env);
    return;
}