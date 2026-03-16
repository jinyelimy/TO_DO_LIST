import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cozy-todos-modal";
const SEOUL_COORDS = { latitude: 37.5665, longitude: 126.978 };

const categoryOptions = ["일정", "일상", "업무", "자기개발"];
const filters = ["전체", ...categoryOptions];
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const categoryMap = {
  Focus: "업무",
  Work: "업무",
  Life: "일상",
  Learning: "자기개발",
  Personal: "일상",
  Schedule: "일정",
};

const categoryMeta = {
  일정: { chipClassName: "rose", icon: "calendar_today" },
  일상: { chipClassName: "mint", icon: "wb_sunny" },
  업무: { chipClassName: "blue", icon: "work" },
  자기개발: { chipClassName: "orange", icon: "auto_stories" },
};

function getTodayIso() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function normalizeCategory(category) {
  if (categoryOptions.includes(category)) {
    return category;
  }

  return categoryMap[category] ?? "일상";
}

function formatDisplayDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function getKoreanHolidaySet(year) {
  const fixedHolidays = [
    `${year}-01-01`,
    `${year}-03-01`,
    `${year}-05-05`,
    `${year}-06-06`,
    `${year}-08-15`,
    `${year}-10-03`,
    `${year}-10-09`,
    `${year}-12-25`,
  ];

  const holidayByYear = {
    2026: [
      "2026-02-16",
      "2026-02-17",
      "2026-02-18",
      "2026-03-02",
      "2026-05-24",
      "2026-05-25",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ],
  };

  return new Set([...(holidayByYear[year] ?? []), ...fixedHolidays]);
}

function buildCalendarDays(selectedDate) {
  const baseDate = new Date(`${selectedDate}T00:00:00`);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidays = getKoreanHolidaySet(year);
  const todayIso = getTodayIso();
  const days = [];

  for (let index = 0; index < startOffset; index += 1) {
    days.push({ key: `empty-${index}`, label: "", isEmpty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    days.push({
      key: isoDate,
      label: String(day),
      isoDate,
      isToday: isoDate === todayIso,
      isSelected: isoDate === selectedDate,
      isSunday: weekday === 0,
      isSaturday: weekday === 6,
      isHoliday: holidays.has(isoDate),
    });
  }

  return {
    title: new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      year: "numeric",
    }).format(baseDate),
    days,
  };
}

function formatTaskTime(value) {
  if (!value) {
    return "시간 미정";
  }

  const [rawHour, rawMinute = "00"] = value.split(":");
  const hour = Number(rawHour);

  if (Number.isNaN(hour)) {
    return value;
  }

  const period = hour >= 12 ? "오후" : "오전";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${rawMinute}`;
}

function formatTaskRange(start, end) {
  if (start && end) {
    return `${formatTaskTime(start)} - ${formatTaskTime(end)}`;
  }

  if (start) {
    return formatTaskTime(start);
  }

  if (end) {
    return `~ ${formatTaskTime(end)}`;
  }

  return "시간 미정";
}

function getWeatherPresentation(code, isDay) {
  if (code === 0) {
    return { label: isDay ? "맑음" : "맑은 밤", icon: isDay ? "light_mode" : "dark_mode" };
  }

  if ([1, 2, 3].includes(code)) {
    return { label: "구름 많음", icon: "cloud" };
  }

  if ([45, 48].includes(code)) {
    return { label: "안개", icon: "foggy" };
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { label: "비", icon: "rainy" };
  }

  if ([56, 57, 66, 67].includes(code)) {
    return { label: "진눈깨비", icon: "weather_mix" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: "눈", icon: "ac_unit" };
  }

  if ([95, 96, 99].includes(code)) {
    return { label: "천둥번개", icon: "thunderstorm" };
  }

  return { label: "날씨 확인", icon: "partly_cloudy_day" };
}

function getProgressMessage(progress) {
  if (progress <= 0) {
    return "시작이 반이야!";
  }

  if (progress <= 25) {
    return "곧 반이야!";
  }

  if (progress <= 50) {
    return "절반 달성!";
  }

  if (progress <= 70) {
    return "고지가 눈앞!";
  }

  if (progress >= 100) {
    return "넌 최고야";
  }

  return "고지가 눈앞!";
}

function getSeedTodos() {
  return [
    {
      id: "sample-2026-03-09-1",
      title: "발표 자료 초안 정리하기",
      category: "업무",
      completed: true,
      startTime: "09:30",
      endTime: "11:00",
      date: "2026-03-09",
    },
    {
      id: "sample-2026-03-09-2",
      title: "카페에서 독서 30분",
      category: "자기개발",
      completed: false,
      startTime: "14:00",
      endTime: "14:30",
      date: "2026-03-09",
    },
    {
      id: "sample-2026-03-09-3",
      title: "저녁 장보기",
      category: "일상",
      completed: false,
      startTime: "18:30",
      endTime: "19:10",
      date: "2026-03-09",
    },
    {
      id: "sample-today-1",
      title: "투두 리스트 마무리 확인하기",
      category: "업무",
      completed: false,
      startTime: "10:00",
      endTime: "11:30",
      date: "2026-03-16",
    },
    {
      id: "sample-today-2",
      title: "산책 20분 하기",
      category: "일상",
      completed: true,
      startTime: "17:00",
      endTime: "17:20",
      date: "2026-03-16",
    },
  ];
}

function normalizeTodo(todo, fallbackDate) {
  return {
    ...todo,
    category: normalizeCategory(todo.category),
    completed: Boolean(todo.completed),
    startTime: todo.startTime ?? todo.time ?? "",
    endTime: todo.endTime ?? "",
    date: todo.date ?? fallbackDate,
  };
}

function ensureSampleTodos(todos) {
  const hasMarchNinthTodos = todos.some((todo) => todo.date === "2026-03-09");

  if (hasMarchNinthTodos) {
    return todos;
  }

  return [...getSeedTodos().slice(0, 3), ...todos];
}

function App() {
  const todayIso = getTodayIso();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return getSeedTodos();
    }

    try {
      const parsed = JSON.parse(saved);
      const normalized = Array.isArray(parsed)
        ? parsed.map((todo) => normalizeTodo(todo, todayIso))
        : [];

      return ensureSampleTodos(normalized);
    } catch {
      return getSeedTodos();
    }
  });
  const [filter, setFilter] = useState("전체");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("일정");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [weather, setWeather] = useState({
    loading: true,
    temperature: null,
    label: "불러오는 중",
    icon: "partly_cloudy_day",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather() {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${SEOUL_COORDS.latitude}&longitude=${SEOUL_COORDS.longitude}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FSeoul`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("weather fetch failed");
        }

        const data = await response.json();
        const current = data.current ?? {};
        const presentation = getWeatherPresentation(current.weather_code, current.is_day === 1);

        setWeather({
          loading: false,
          temperature:
            typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : null,
          label: presentation.label,
          icon: presentation.icon,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setWeather({
          loading: false,
          temperature: null,
          label: "날씨 불러오기 실패",
          icon: "cloud_off",
        });
      }
    }

    loadWeather();

    return () => controller.abort();
  }, []);

  const calendar = useMemo(() => buildCalendarDays(selectedDate), [selectedDate]);
  const selectedDateTodos = useMemo(
    () => todos.filter((todo) => todo.date === selectedDate),
    [selectedDate, todos],
  );
  const visibleTodos = useMemo(() => {
    let filtered = selectedDateTodos;

    if (filter !== "전체") {
      filtered = filtered.filter((todo) => todo.category === filter);
    }

    if (hideCompleted) {
      filtered = filtered.filter((todo) => !todo.completed);
    }

    return filtered;
  }, [filter, hideCompleted, selectedDateTodos]);

  const completedCount = selectedDateTodos.filter((todo) => todo.completed).length;
  const activeCount = selectedDateTodos.length - completedCount;
  const progress =
    selectedDateTodos.length === 0
      ? 0
      : Math.round((completedCount / selectedDateTodos.length) * 100);
  const progressMessage = getProgressMessage(progress);
  const selectedDateLabel = formatDisplayDate(selectedDate);

  const resetForm = () => {
    setDraft("");
    setCategory("일정");
    setStartTime("09:00");
    setEndTime("10:00");
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

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
        startTime,
        endTime,
        date: selectedDate,
      },
      ...current,
    ]);
    closeModal();
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

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <span className="material-symbols-outlined">wb_sunny</span>
            </div>
            <div>
              <h1>Cozy To-Do</h1>
              <p>차분하게, 하지만 분명하게</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className="nav-item active" type="button">
              <span className="material-symbols-outlined">view_list</span>
              <span>할 일</span>
            </button>
            <button className="nav-item" type="button">
              <span className="material-symbols-outlined">calendar_today</span>
              <span>캘린더</span>
            </button>
            <button className="nav-item" type="button">
              <span className="material-symbols-outlined">bar_chart</span>
              <span>통계</span>
            </button>
            <button className="nav-item" type="button">
              <span className="material-symbols-outlined">person</span>
              <span>프로필</span>
            </button>
          </nav>

          <button
            className="sidebar-cta sidebar-cta-bottom"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="material-symbols-outlined">add</span>
            <span>새 할 일 추가</span>
          </button>
        </aside>

        <main className="main-panel">
          <header className="topbar">
            <div>
              <h2 className="title-with-icon">
                <span>† 옐링그의 To-do List ¢</span>
              </h2>
            </div>
            <div className="topbar-actions">
              <button className="icon-button" type="button" aria-label="알림">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="streak-badge">
                <span className="material-symbols-outlined">local_fire_department</span>
                <span>12일 연속</span>
              </div>
            </div>
          </header>

          <div className="content-grid">
            <section className="primary-column">
              <section className="progress-card">
                <div className="progress-layout">
                  <div className="progress-copy">
                    <p className="section-label">오늘의 진행률</p>
                    <p className="progress-date">{selectedDateLabel}</p>
                    <h3>
                      {selectedDateTodos.length}개 중 {completedCount}개 완료했어요.
                    </h3>
                    <div className="progress-meta">
                      <div className="progress-race" aria-hidden="true">
                        <div className="progress-lane">
                          <div
                            className="cat-runner"
                            style={{ left: `clamp(0px, calc(${progress}% - 26px), calc(100% - 52px))` }}
                          >
                            <span className="runner-bubble">{progressMessage}</span>
                            <span className="paw-runner">♧</span>
                          </div>
                        </div>
                      </div>
                      <div className="progress-track" aria-hidden="true">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="progress-row">
                        <span>완료율</span>
                        <strong>{progress}%</strong>
                      </div>
                    </div>
                  </div>

                  <aside className="weather-panel">
                    <p className="weather-label">서울 날씨</p>
                    <div className="weather-icon-wrap">
                      <span className="material-symbols-outlined">{weather.icon}</span>
                    </div>
                    <strong>{weather.temperature === null ? "--" : `${weather.temperature}°`}</strong>
                    <p>{weather.label}</p>
                    <span className="weather-footnote">
                      {weather.loading ? "실시간 정보 불러오는 중" : "실시간 기준"}
                    </span>
                  </aside>
                </div>
              </section>

              <section className="task-board">
                <div className="task-board-header">
                  <div>
                    <p className="section-label">오늘의 할 일</p>
                    <p className="progress-date">{selectedDateLabel}</p>
                    <h3>Tasks</h3>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setHideCompleted((current) => !current)}
                  >
                    {hideCompleted ? "완료 항목도 보기" : "완료 항목 가리기"}
                  </button>
                </div>

                <div className="filter-row" role="tablist" aria-label="카테고리 필터">
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

                <div className="task-list">
                  {visibleTodos.length === 0 ? (
                    <article className="empty-card">
                      <h4>이 날짜에는 할 일이 없어요</h4>
                      <p>캘린더에서 다른 날짜를 누르거나 새 할 일을 추가해보세요.</p>
                    </article>
                  ) : (
                    visibleTodos.map((todo) => {
                      const meta = categoryMeta[todo.category];

                      return (
                        <article
                          key={todo.id}
                          className={todo.completed ? "task-card completed" : "task-card"}
                        >
                          <button
                            className={todo.completed ? "check-button checked" : "check-button"}
                            onClick={() => toggleTodo(todo.id)}
                            type="button"
                            aria-label={`${todo.title} 완료 상태 변경`}
                          >
                            <span className="material-symbols-outlined">check</span>
                          </button>

                          <div className="task-content">
                            <h4>{todo.title}</h4>
                            <div className="task-meta">
                              <span className="task-time">
                                <span className="material-symbols-outlined">schedule</span>
                                {formatTaskRange(todo.startTime, todo.endTime)}
                              </span>
                              <span className={`category-badge ${meta.chipClassName}`}>
                                <span className="material-symbols-outlined">{meta.icon}</span>
                                {todo.category}
                              </span>
                            </div>
                          </div>

                          <button
                            className="more-button"
                            onClick={() => deleteTodo(todo.id)}
                            type="button"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </section>

            <aside className="secondary-column">
              <section className="panel-card calendar-card">
                <div className="panel-head">
                  <h4>{calendar.title}</h4>
                  <div className="calendar-arrows" aria-hidden="true">
                    <span className="material-symbols-outlined">chevron_left</span>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </div>
                </div>
                <div className="calendar-grid weekday">
                  {weekdayLabels.map((day, index) => (
                    <span
                      key={day}
                      className={index === 0 ? "weekday-sunday" : index === 6 ? "weekday-saturday" : ""}
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <div className="calendar-grid days">
                  {calendar.days.map((day) => (
                    <button
                      key={day.key}
                      className={[
                        "calendar-day",
                        day.isEmpty ? "empty" : "",
                        day.isSelected ? "selected" : "",
                        day.isToday ? "today" : "",
                        day.isHoliday || day.isSunday ? "holiday" : "",
                        day.isSaturday ? "saturday" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      disabled={day.isEmpty}
                      onClick={() => day.isoDate && setSelectedDate(day.isoDate)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-card quote-card">
                <div className="quote-illustration">
                  <span className="material-symbols-outlined">potted_plant</span>
                </div>
                <h4>오늘의 한마디</h4>
                <p>"좋은 흐름은 대단한 결심보다 작은 시작에서 만들어집니다."</p>
              </section>

              <section className="panel-card stats-card">
                <div>
                  <span>전체</span>
                  <strong>{selectedDateTodos.length}</strong>
                </div>
                <div>
                  <span>완료</span>
                  <strong>{completedCount}</strong>
                </div>
                <div>
                  <span>남음</span>
                  <strong>{activeCount}</strong>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

      {isModalOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="todo-modal-title"
          onClick={closeModal}
        >
          <div className="todo-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="todo-modal-title">
                  <span className="material-symbols-outlined">edit_calendar</span>
                  새로운 할 일 추가
                </h2>
                <p>{selectedDateLabel}에 추가할 일정을 입력해보세요.</p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="레이어 닫기">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <section className="modal-section">
                <label>카테고리 선택</label>
                <div className="modal-category-list" role="listbox" aria-label="카테고리 선택">
                  {categoryOptions.map((option) => {
                    const meta = categoryMeta[option];

                    return (
                      <button
                        key={option}
                        className={
                          category === option
                            ? `modal-category ${meta.chipClassName} active`
                            : `modal-category ${meta.chipClassName}`
                        }
                        onClick={() => setCategory(option)}
                        type="button"
                        aria-selected={category === option}
                      >
                        <span className="material-symbols-outlined">{meta.icon}</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="modal-section">
                <label htmlFor="todo-input">할 일 내용</label>
                <textarea
                  id="todo-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="할 일을 입력하세요 (예: 비타민 챙겨먹기, 독서 30분)"
                />
              </section>

              <section className="modal-time-grid">
                <div className="modal-section">
                  <label htmlFor="start-time">시작 시간</label>
                  <div className="time-field">
                    <span className="material-symbols-outlined">schedule</span>
                    <input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-section">
                  <label htmlFor="end-time">종료 시간</label>
                  <div className="time-field">
                    <span className="material-symbols-outlined">schedule</span>
                    <input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>
                </div>
              </section>

              <div className="modal-actions">
                <button className="modal-cancel" type="button" onClick={closeModal}>
                  취소
                </button>
                <button className="modal-submit" type="submit">
                  <span className="material-symbols-outlined">add_task</span>
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
