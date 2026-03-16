import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "momentum-todos";

const seedTodos = [
  {
    id: crypto.randomUUID(),
    title: "프로젝트 구조 정리하기",
    category: "Focus",
    completed: false,
  },
  {
    id: crypto.randomUUID(),
    title: "운동 30분 하기",
    category: "Life",
    completed: true,
  },
  {
    id: crypto.randomUUID(),
    title: "읽고 싶은 아티클 저장하기",
    category: "Learning",
    completed: false,
  },
];

const filters = ["All", "Active", "Done"];

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return seedTodos;
    }

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : seedTodos;
    } catch {
      return seedTodos;
    }
  });
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("Focus");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const visibleTodos = useMemo(() => {
    if (filter === "Active") {
      return todos.filter((todo) => !todo.completed);
    }

    if (filter === "Done") {
      return todos.filter((todo) => todo.completed);
    }

    return todos;
  }, [filter, todos]);

  const completedCount = todos.filter((todo) => todo.completed).length;
  const progress = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = draft.trim();

    if (!title) {
      return;
    }

    setTodos((current) => [
      {
        id: crypto.randomUUID(),
        title,
        category,
        completed: false,
      },
      ...current,
    ]);
    setDraft("");
    setCategory("Focus");
  };

  const toggleTodo = (id) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const deleteTodo = (id) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((current) => current.filter((todo) => !todo.completed));
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Daily Momentum</p>
          <h1>오늘의 할 일을 가볍고 선명하게 정리해보세요.</h1>
          <p className="hero-text">
            우선순위가 보이고, 완료할수록 동기부여가 쌓이는 개인용 투두 리스트입니다.
          </p>
        </div>
        <div className="stats-panel">
          <div>
            <span className="stats-label">Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="stats-grid">
            <article>
              <span>전체</span>
              <strong>{todos.length}</strong>
            </article>
            <article>
              <span>완료</span>
              <strong>{completedCount}</strong>
            </article>
            <article>
              <span>남음</span>
              <strong>{todos.length - completedCount}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="board">
        <form className="composer" onSubmit={handleSubmit}>
          <label className="input-group">
            <span>New task</span>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="예: 회의 자료 정리하기"
            />
          </label>

          <label className="input-group compact">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="Focus">Focus</option>
              <option value="Work">Work</option>
              <option value="Life">Life</option>
              <option value="Learning">Learning</option>
            </select>
          </label>

          <button className="primary-button" type="submit">
            추가하기
          </button>
        </form>

        <div className="toolbar">
          <div className="filter-group" role="tablist" aria-label="Todo filter">
            {filters.map((name) => (
              <button
                key={name}
                className={filter === name ? "filter-chip active" : "filter-chip"}
                onClick={() => setFilter(name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>

          <button className="ghost-button" type="button" onClick={clearCompleted}>
            완료 항목 비우기
          </button>
        </div>

        <div className="todo-list">
          {visibleTodos.length === 0 ? (
            <article className="empty-state">
              <h2>보여줄 할 일이 없어요.</h2>
              <p>새로운 작업을 추가하거나 필터를 바꿔서 확인해보세요.</p>
            </article>
          ) : (
            visibleTodos.map((todo) => (
              <article
                key={todo.id}
                className={todo.completed ? "todo-card completed" : "todo-card"}
              >
                <button
                  className={todo.completed ? "check-button checked" : "check-button"}
                  onClick={() => toggleTodo(todo.id)}
                  type="button"
                  aria-label={`${todo.title} 완료 상태 변경`}
                >
                  <span />
                </button>

                <div className="todo-content">
                  <span className="category-pill">{todo.category}</span>
                  <h2>{todo.title}</h2>
                </div>

                <button
                  className="delete-button"
                  onClick={() => deleteTodo(todo.id)}
                  type="button"
                >
                  Delete
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
