import { useState, useRef } from 'react';
import { Todo } from '../types';

interface TodoListProps {
    todos: Todo[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, updatedFields: Partial<Omit<Todo, 'id'>>) => void;
    onReorder: (fromId: string, toId: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete, onEdit, onReorder }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const draggedOverRef = useRef<string | null>(null);

    // Sort todos by start date and time
    const sortedTodos = [...todos].sort((a, b) => {
        // If we have position, use it for sorting
        if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
        }

        // Otherwise, fall back to date/time sorting
        // First, compare start dates
        const dateComparison = a.startDate.getTime() - b.startDate.getTime();
        if (dateComparison !== 0) return dateComparison;

        // If start dates are equal, compare start times
        const [aHours, aMinutes] = a.startTime.split(':').map(Number);
        const [bHours, bMinutes] = b.startTime.split(':').map(Number);

        const aMinutesTotal = aHours * 60 + aMinutes;
        const bMinutesTotal = bHours * 60 + bMinutes;

        return aMinutesTotal - bMinutesTotal;
    });

    // Group todos by start date
    const groupedTodos: Record<string, Todo[]> = {};

    sortedTodos.forEach(todo => {
        const dateString = todo.startDate.toDateString();
        if (!groupedTodos[dateString]) {
            groupedTodos[dateString] = [];
        }
        groupedTodos[dateString].push(todo);
    });

    // Get sorted dates
    const sortedDates = Object.keys(groupedTodos).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
    });

    if (sortedTodos.length === 0) {
        return (
            <div className="todo-list empty">
                <p>No tasks yet. Click on the clock to add a new task!</p>
            </div>
        );
    }

    // Check if a task spans multiple days
    const isMultiDayTask = (todo: Todo) => {
        return todo.startDate.toDateString() !== todo.endDate.toDateString();
    };

    // Format time display
    const formatTimeRange = (todo: Todo) => {
        if (isMultiDayTask(todo)) {
            const startDate = todo.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const endDate = todo.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return `${startDate} ${todo.startTime} - ${endDate} ${todo.endTime}`;
        }
        return `${todo.startTime} - ${todo.endTime}`;
    };

    // Calculate duration in human-readable format
    const formatDuration = (todo: Todo) => {
        const startDateTime = new Date(`${todo.startDate.toISOString().split('T')[0]}T${todo.startTime}`);
        const endDateTime = new Date(`${todo.endDate.toISOString().split('T')[0]}T${todo.endTime}`);

        const diffMs = endDateTime.getTime() - startDateTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours >= 24) {
            const days = Math.floor(diffHours / 24);
            const hours = diffHours % 24;
            return `(${days}d ${hours}h ${diffMinutes}m)`;
        }

        return `(${diffHours}h ${diffMinutes}m)`;
    };

    // Start editing a todo
    const handleEditStart = (todo: Todo) => {
        setEditingId(todo.id);
        setEditDescription(todo.description);
        setEditStartTime(todo.startTime);
        setEditEndTime(todo.endTime);
    };

    // Save edits
    const handleEditSave = (id: string) => {
        if (!editDescription.trim()) {
            alert('Task description cannot be empty');
            return;
        }

        if (!editStartTime || !editEndTime) {
            alert('Start and end times are required');
            return;
        }

        onEdit(id, {
            description: editDescription.trim(),
            startTime: editStartTime,
            endTime: editEndTime
        });

        setEditingId(null);
    };

    // Cancel editing
    const handleEditCancel = () => {
        setEditingId(null);
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        draggedOverRef.current = id;
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (draggedId && draggedId !== id) {
            onReorder(draggedId, id);
        }
        setDraggedId(null);
        draggedOverRef.current = null;
    };

    return (
        <div className="todo-list">
            {sortedDates.map(dateString => (
                <div key={dateString} className="todo-date-group">
                    <h3>{dateString}</h3>
                    <ul>
                        {groupedTodos[dateString].map(todo => (
                            <li
                                key={todo.id}
                                className={`${todo.completed ? 'completed' : ''} ${draggedId === todo.id ? 'dragging' : ''} ${draggedOverRef.current === todo.id ? 'drag-over' : ''}`}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, todo.id)}
                                onDragOver={(e) => handleDragOver(e, todo.id)}
                                onDrop={(e) => handleDrop(e, todo.id)}
                            >
                                {editingId === todo.id ? (
                                    <div className="todo-edit-form">
                                        <input
                                            type="text"
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Task description"
                                            className="edit-description"
                                        />
                                        <div className="edit-time-inputs">
                                            <input
                                                type="time"
                                                value={editStartTime}
                                                onChange={(e) => setEditStartTime(e.target.value)}
                                                className="edit-time"
                                            />
                                            <span>to</span>
                                            <input
                                                type="time"
                                                value={editEndTime}
                                                onChange={(e) => setEditEndTime(e.target.value)}
                                                className="edit-time"
                                            />
                                        </div>
                                        <div className="edit-actions">
                                            <button onClick={() => handleEditSave(todo.id)} className="save-btn">Save</button>
                                            <button onClick={handleEditCancel} className="cancel-btn">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="todo-item">
                                        <input
                                            type="checkbox"
                                            checked={todo.completed}
                                            onChange={() => onToggle(todo.id)}
                                        />
                                        <div className="todo-content">
                                            <p className="todo-description">{todo.description}</p>
                                            <p className="todo-time">
                                                {formatTimeRange(todo)} <span className="todo-duration">{formatDuration(todo)}</span>
                                                {isMultiDayTask(todo) && <span className="multi-day-badge">Multi-day</span>}
                                            </p>
                                        </div>
                                        <div className="todo-actions">
                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEditStart(todo)}
                                                aria-label="Edit task"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => onDelete(todo.id)}
                                                aria-label="Delete task"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default TodoList; 