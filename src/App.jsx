import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getDailyQuoteIndex, quoteLibrary } from "./quotes";

const STORAGE_KEY = "cozy-todos-modal";
const SEOUL_COORDS = { latitude: 37.5665, longitude: 126.978 };

const categoryOptions = ["일정", "일상", "업무", "자기개발"];
const filters = ["전체", ...categoryOptions];
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const categorySortOrder = {
  일정: 0,
  일상: 1,
  업무: 2,
  자기개발: 3,
};

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

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

function TimeSelect({ id, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div className="time-field time-select" ref={rootRef}>
      <span className="material-symbols-outlined">schedule</span>
      <button
        id={id}
        className={isOpen ? "time-select-trigger open" : "time-select-trigger"}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{value}</span>
        <span className="material-symbols-outlined time-select-arrow">expand_more</span>
      </button>

      {isOpen ? (
        <div className="time-select-menu" role="listbox" aria-labelledby={id}>
          {timeOptions.map((option) => (
            <button
              key={option}
              className={option === value ? "time-select-option active" : "time-select-option"}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  return buildCalendarDaysForMonth(year, month, selectedDate);
}

function buildCalendarDaysForMonth(year, month, selectedDate) {
  const baseDate = new Date(year, month, 1);
  const displayYear = baseDate.getFullYear();
  const displayMonth = baseDate.getMonth();
  const firstDay = new Date(displayYear, displayMonth, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const todayIso = getTodayIso();
  const days = [];
  const prevMonthLastDate = new Date(displayYear, displayMonth, 0).getDate();

  for (let index = startOffset - 1; index >= 0; index -= 1) {
    const day = prevMonthLastDate - index;
    const date = new Date(displayYear, displayMonth - 1, day);
    const weekday = date.getDay();
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const holidays = getKoreanHolidaySet(date.getFullYear());

    days.push({
      key: isoDate,
      label: String(day),
      isoDate,
      isToday: isoDate === todayIso,
      isSelected: isoDate === selectedDate,
      isSunday: weekday === 0,
      isSaturday: weekday === 6,
      isHoliday: holidays.has(isoDate),
      isOutsideMonth: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(displayYear, displayMonth, day);
    const weekday = date.getDay();
    const isoDate = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const holidays = getKoreanHolidaySet(displayYear);

    days.push({
      key: isoDate,
      label: String(day),
      isoDate,
      isToday: isoDate === todayIso,
      isSelected: isoDate === selectedDate,
      isSunday: weekday === 0,
      isSaturday: weekday === 6,
      isHoliday: holidays.has(isoDate),
      isOutsideMonth: false,
    });
  }

  let nextMonthDay = 1;
  while (days.length < 35) {
    const date = new Date(displayYear, displayMonth + 1, nextMonthDay);
    const weekday = date.getDay();
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(nextMonthDay).padStart(2, "0")}`;
    const holidays = getKoreanHolidaySet(date.getFullYear());

    days.push({
      key: isoDate,
      label: String(nextMonthDay),
      isoDate,
      isToday: isoDate === todayIso,
      isSelected: isoDate === selectedDate,
      isSunday: weekday === 0,
      isSaturday: weekday === 6,
      isHoliday: holidays.has(isoDate),
      isOutsideMonth: true,
    });

    nextMonthDay += 1;
  }

  return {
    title: new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      year: "numeric",
    }).format(baseDate),
    days: days.slice(0, 35),
  };
}

function getMonthKeyFromIso(isoDate) {
  return isoDate.slice(0, 7);
}

function shiftMonth(isoDate, offset) {
  const [year, month] = isoDate.split("-").map(Number);
  const nextDate = new Date(year, month - 1 + offset, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;
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

function compareTodos(a, b) {
  const startComparison = (a.startTime || "").localeCompare(b.startTime || "");

  if (startComparison !== 0) {
    return startComparison;
  }

  const categoryComparison =
    (categorySortOrder[a.category] ?? Number.MAX_SAFE_INTEGER) -
    (categorySortOrder[b.category] ?? Number.MAX_SAFE_INTEGER);

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  return (a.endTime || "").localeCompare(b.endTime || "");
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
  if (progress <= 25) {
    return "시작이 반이야!";
  }

  if (progress <= 49) {
    return "곧 반이야!";
  }

  if (progress === 50) {
    return "절반 달성!";
  }

  if (progress <= 75) {
    return "조금만 더!";
  }

  if (progress <= 99) {
    return "고지가 눈앞!";
  }

  if (progress >= 100) {
    return "넌 최고야";
  }

  return "시작이 반이야!";
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
  const [displayedMonth, setDisplayedMonth] = useState(todayIso);
  const [appScale, setAppScale] = useState(1);
  const [appShellSize, setAppShellSize] = useState({ width: 1600, height: 1100 });
  const appShellRef = useRef(null);
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
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [quoteIndex, setQuoteIndex] = useState(() => getDailyQuoteIndex(todayIso));
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("일정");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [timeError, setTimeError] = useState("");
  const [weather, setWeather] = useState({
    loading: true,
    temperature: null,
    apparentTemperature: null,
    humidity: null,
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
          `https://api.open-meteo.com/v1/forecast?latitude=${SEOUL_COORDS.latitude}&longitude=${SEOUL_COORDS.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&timezone=Asia%2FSeoul`,
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
          apparentTemperature:
            typeof current.apparent_temperature === "number"
              ? Math.round(current.apparent_temperature)
              : null,
          humidity:
            typeof current.relative_humidity_2m === "number"
              ? Math.round(current.relative_humidity_2m)
              : null,
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
          apparentTemperature: null,
          humidity: null,
          label: "날씨 불러오기 실패",
          icon: "cloud_off",
        });
      }
    }

    loadWeather();

    return () => controller.abort();
  }, []);

  const calendar = useMemo(() => {
    const [year, month] = displayedMonth.split("-").map(Number);
    return buildCalendarDaysForMonth(year, month - 1, selectedDate);
  }, [displayedMonth, selectedDate]);
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

    return [...filtered].sort(compareTodos);
  }, [filter, hideCompleted, selectedDateTodos]);

  const completedCount = selectedDateTodos.filter((todo) => todo.completed).length;
  const activeCount = selectedDateTodos.length - completedCount;
  const progress =
    selectedDateTodos.length === 0
      ? 0
      : Math.round((completedCount / selectedDateTodos.length) * 100);
  const progressMessage = getProgressMessage(progress);
  const selectedDateLabel = formatDisplayDate(selectedDate);
  const isEditing = editingTodoId !== null;
  const isPastSelectedDate = selectedDate < todayIso;
  const dailyQuote = quoteLibrary[quoteIndex];

  useEffect(() => {
    setQuoteIndex(getDailyQuoteIndex(todayIso));
  }, [todayIso]);

  useLayoutEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const shell = appShellRef.current;

      if (viewportWidth <= 1120) {
        setAppScale(1);
        return;
      }

      if (!shell) {
        return;
      }

      const nextWidth = shell.scrollWidth || 1600;
      const nextHeight = shell.scrollHeight || 1100;

      setAppShellSize({ width: nextWidth, height: nextHeight });

      const availableWidth = viewportWidth - 20;
      const availableHeight = viewportHeight - 20;
      const nextScale = Math.min(availableWidth / nextWidth, availableHeight / nextHeight, 1);

      setAppScale(nextScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    const resizeObserver =
      appShellRef.current && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateScale())
        : null;

    if (resizeObserver && appShellRef.current) {
      resizeObserver.observe(appShellRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateScale);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (getMonthKeyFromIso(displayedMonth) !== getMonthKeyFromIso(selectedDate)) {
      setDisplayedMonth(`${getMonthKeyFromIso(selectedDate)}-01`);
    }
  }, [selectedDate]);

  const resetForm = () => {
    setDraft("");
    setCategory("일정");
    setStartTime("09:00");
    setEndTime("10:00");
    setTimeError("");
  };

  const openCreateModal = () => {
    if (isPastSelectedDate) {
      return;
    }

    setEditingTodoId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (todo) => {
    if (todo.date < todayIso) {
      return;
    }

    setEditingTodoId(todo.id);
    setDraft(todo.title);
    setCategory(todo.category);
    setStartTime(todo.startTime || "09:00");
    setEndTime(todo.endTime || "10:00");
    setTimeError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTodoId(null);
    resetForm();
    setIsModalOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isPastSelectedDate) {
      return;
    }

    const title = draft.trim();

    if (!title) {
      return;
    }

    if (endTime < startTime) {
      setTimeError("종료 시간은 시작 시간보다 빠를 수 없어요.");
      return;
    }

    if (isEditing) {
      setTodos((current) =>
        current.map((todo) =>
          todo.id === editingTodoId
            ? { ...todo, title, category, startTime, endTime }
            : todo,
        ),
      );
    } else {
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
    }

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
    setTodos((current) => current.filter((todo) => !(todo.id === id && todo.date >= todayIso)));
  };

  const moveCalendarMonth = (offset) => {
    setDisplayedMonth((current) => shiftMonth(current, offset));
  };

  const showAnotherQuote = () => {
    setQuoteIndex((current) => {
      if (quoteLibrary.length <= 1) {
        return current;
      }

      let nextIndex = current;

      while (nextIndex === current) {
        nextIndex = Math.floor(Math.random() * quoteLibrary.length);
      }

      return nextIndex;
    });
  };

  return (
    <>
      <div className="app-viewport">
        <div
          className="app-scale-frame"
          style={{ width: `${appShellSize.width * appScale}px`, height: `${appShellSize.height * appScale}px` }}
        >
          <div className="app-shell" ref={appShellRef} style={{ transform: `scale(${appScale})` }}>
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
            className={isPastSelectedDate ? "sidebar-cta sidebar-cta-bottom disabled-action" : "sidebar-cta sidebar-cta-bottom"}
            type="button"
            onClick={openCreateModal}
            disabled={isPastSelectedDate}
          >
            <span className="material-symbols-outlined">add</span>
            <span>{isPastSelectedDate ? "지난 날짜는 추가 불가" : "새 할 일 추가"}</span>
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
                    <div className="weather-top">
                      <div>
                        <p className="weather-label">오늘의 날씨 (서울)</p>
                        <div className="weather-summary">
                          <strong>{weather.temperature === null ? "--" : `${weather.temperature}°`}</strong>
                          <p>{weather.label}</p>
                        </div>
                      </div>
                      <div className="weather-icon-wrap">
                        <span className="material-symbols-outlined">{weather.icon}</span>
                      </div>
                    </div>

                    <div className="weather-detail-grid">
                      <div className="weather-detail">
                        <span>체감</span>
                        <strong>
                          {weather.apparentTemperature === null ? "--" : `${weather.apparentTemperature}°`}
                        </strong>
                      </div>
                      <div className="weather-detail">
                        <span>습도</span>
                        <strong>{weather.humidity === null ? "--" : `${weather.humidity}%`}</strong>
                      </div>
                      <div className="weather-detail">
                        <span>하늘</span>
                        <strong>{weather.label}</strong>
                      </div>
                    </div>

                    <div className="weather-footnote">
                      <span className="material-symbols-outlined">schedule</span>
                      <span>{weather.loading ? "실시간 정보 불러오는 중" : "실시간 기준"}</span>
                    </div>
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
                  {completedCount > 0 ? (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setHideCompleted((current) => !current)}
                    >
                      {hideCompleted ? "완료 항목도 보기" : "완료 항목 가리기"}
                    </button>
                  ) : null}
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

                          <div className="task-actions">
                            <button
                              className={todo.date < todayIso ? "more-button disabled-action" : "more-button"}
                              onClick={() => openEditModal(todo)}
                              type="button"
                              aria-label={`${todo.title} 수정`}
                              disabled={todo.date < todayIso}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              className={todo.date < todayIso ? "more-button disabled-action" : "more-button"}
                              onClick={() => deleteTodo(todo.id)}
                              type="button"
                              aria-label={`${todo.title} 삭제`}
                              disabled={todo.date < todayIso}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
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
                  <div className="calendar-arrows">
                    <button
                      className="calendar-arrow-button"
                      type="button"
                      onClick={() => moveCalendarMonth(-1)}
                      aria-label="이전 달 보기"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                      className="calendar-arrow-button"
                      type="button"
                      onClick={() => moveCalendarMonth(1)}
                      aria-label="다음 달 보기"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
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
                        day.isOutsideMonth ? "outside-month" : "",
                        day.isSelected ? "selected" : "",
                        day.isToday ? "today" : "",
                        day.isHoliday || day.isSunday ? "holiday" : "",
                        day.isSaturday ? "saturday" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      onClick={() => day.isoDate && setSelectedDate(day.isoDate)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="insight-stack">
                <section className="panel-card quote-card">
                  <div className="quote-copy">
                    <button className="quote-refresh" type="button" onClick={showAnotherQuote}>
                      다른 명언 보기
                    </button>
                    <div className="quote-header">
                      <h4>오늘의 한마디</h4>
                    </div>
                    <p>"{dailyQuote.text}"</p>
                    <strong>{dailyQuote.author}</strong>
                  </div>
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
              </div>
            </aside>
          </div>
        </main>
      </div>
        </div>
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
                  {isEditing ? "할 일 수정" : "새로운 할 일 추가"}
                </h2>
                <p>
                  {isEditing
                    ? `${selectedDateLabel}의 일정을 수정해보세요.`
                    : `${selectedDateLabel}에 추가할 일정을 입력해보세요.`}
                </p>
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
                  <TimeSelect
                    id="start-time"
                    value={startTime}
                    onChange={(nextValue) => {
                      setStartTime(nextValue);
                      setTimeError("");
                    }}
                  />
                </div>

                <div className="modal-section">
                  <label htmlFor="end-time">종료 시간</label>
                  <TimeSelect
                    id="end-time"
                    value={endTime}
                    onChange={(nextValue) => {
                      setEndTime(nextValue);
                      setTimeError("");
                    }}
                  />
                </div>
              </section>

              {timeError ? <p className="modal-error">{timeError}</p> : null}

              <div className="modal-actions">
                <button className="modal-cancel" type="button" onClick={closeModal}>
                  취소
                </button>
                <button className="modal-submit" type="submit">
                  <span className="material-symbols-outlined">
                    {isEditing ? "save" : "add_task"}
                  </span>
                  {isEditing ? "저장하기" : "추가하기"}
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
