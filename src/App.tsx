import { useState, useEffect } from 'react'
import './App.css'
import AnalogClock from './components/AnalogClock'
import TodoList from './components/TodoList'
import { useTodos } from './hooks/useTodos'

function App() {
  const { todos, addTodo, toggleTodo, deleteTodo, updateTodo, reorderTodos } = useTodos()
  const [selectedStartHour, setSelectedStartHour] = useState<number | undefined>(undefined)
  const [selectedStartMinute, setSelectedStartMinute] = useState<number | undefined>(undefined)
  const [selectedEndHour, setSelectedEndHour] = useState<number | undefined>(undefined)
  const [selectedEndMinute, setSelectedEndMinute] = useState<number | undefined>(undefined)
  const [daysToAdd, setDaysToAdd] = useState<number>(0)
  const [darkMode, setDarkMode] = useState<boolean>(true) // Default to dark mode

  // Set up dark mode on component mount
  useEffect(() => {
    // Check for user's preferred color scheme
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';

    // Set dark mode based on saved preference or system preference, but default to true if no preference
    const initialDarkMode = localStorage.getItem('darkMode') !== null
      ? savedDarkMode
      : true;
    setDarkMode(initialDarkMode);
  }, [])

  // Apply dark mode class to the document body whenever darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Save preference to localStorage
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleTimeSelection = (
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    rotationCount: number
  ) => {
    setSelectedStartHour(startHour)
    setSelectedStartMinute(startMinute)
    setSelectedEndHour(endHour)
    setSelectedEndMinute(endMinute)
    setDaysToAdd(rotationCount)
  }

  const handleFormSubmit = (todoData: any) => {
    addTodo(todoData)
    resetTimeSelection()
  }

  const handleFormCancel = () => {
    resetTimeSelection()
  }

  const resetTimeSelection = () => {
    setSelectedStartHour(undefined)
    setSelectedStartMinute(undefined)
    setSelectedEndHour(undefined)
    setSelectedEndMinute(undefined)
    setDaysToAdd(0)
  }

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  }

  return (
    <div className="app">
      <main>
        <div className="app-container">
          <div className="clock-section">
            <AnalogClock
              todos={todos}
              onTimeSelection={handleTimeSelection}
              initialStartHour={selectedStartHour}
              initialStartMinute={selectedStartMinute}
              initialEndHour={selectedEndHour}
              initialEndMinute={selectedEndMinute}
              daysToAdd={daysToAdd}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>

          <div className="todo-section">
            <TodoList
              todos={todos}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={updateTodo}
              onReorder={reorderTodos}
            />
          </div>
        </div>
      </main>

      <div className="dark-mode-toggle-container">
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className={`theme-toggle-btn ${darkMode ? 'dark' : 'light'}`}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}

export default App
