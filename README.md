# AI-тренажер ЕНТ

## Быстрый запуск (одна команда)

**Windows** — дважды кликните `start.bat` или в терминале из папки проекта:

```powershell
npm start
```

Откроется сайт: **http://localhost:3000**

Скрипт сам:
- освобождает занятые порты 8080 и 3000
- запускает backend (Go)
- запускает frontend (Vite)

Остановка: `Ctrl+C` в терминале.

---

## Запуск по отдельности

**Backend:**
```powershell
go run main.go
```

**Frontend** (в другом терминале):
```powershell
cd frontend
npm install
npm run dev
```

---

## AI (опционально)

Скопируйте `.env.example` → `.env` и укажите `OPENAI_API_KEY` для AI-подсказок и перевода вопросов.

## Демо-аккаунты

- `demo@example.com` / `demo12345`
- `nurkhan@example.com` / `12345678`
