import { useState, useEffect } from 'react';
import { Todo } from '../types';

export const useTodos = () => {
    const [todos, setTodos] = useState<Todo[]>(() => {
        const savedTodos = localStorage.getItem('todos');
        if (savedTodos) {
            try {
                // Parse the saved todos and convert date strings back to Date objects
                return JSON.parse(savedTodos).map((todo: any) => ({
                    ...todo,
                    startDate: new Date(todo.startDate),
                    endDate: new Date(todo.endDate),
                    notified: todo.notified || false
                }));
            } catch (e) {
                console.error('Failed to parse saved todos', e);
                return [];
            }
        }
        return [];
    });

    useEffect(() => {
        // Convert Date objects to strings before storing in localStorage
        const todosToSave = todos.map(todo => ({
            ...todo,
            startDate: todo.startDate.toISOString(),
            endDate: todo.endDate.toISOString()
        }));
        localStorage.setItem('todos', JSON.stringify(todosToSave));
    }, [todos]);

    // Check for tasks that need notifications
    useEffect(() => {
        const checkForNotifications = () => {
            const now = new Date();

            todos.forEach(todo => {
                if (todo.completed || todo.notified) return;

                const endDateTime = new Date(`${todo.endDate.toISOString().split('T')[0]}T${todo.endTime}`);
                const timeDiff = endDateTime.getTime() - now.getTime();

                // If end time is within 1 minute or has passed but not more than 5 minutes ago
                if (timeDiff <= 60000 && timeDiff > -300000) {
                    // Send notification
                    sendNotification(todo);

                    // Mark as notified
                    setTodos(prevTodos =>
                        prevTodos.map(t =>
                            t.id === todo.id ? { ...t, notified: true } : t
                        )
                    );
                }
            });
        };

        // Check every 30 seconds
        const notificationInterval = setInterval(checkForNotifications, 30000);

        return () => clearInterval(notificationInterval);
    }, [todos]);

    // Send browser notification
    const sendNotification = (todo: Todo) => {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        // Request permission if needed
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
            return;
        }

        if (Notification.permission === "granted") {
            const now = new Date();
            const endDateTime = new Date(`${todo.endDate.toISOString().split('T')[0]}T${todo.endTime}`);
            const timeDiff = endDateTime.getTime() - now.getTime();

            let message = "";
            if (timeDiff > 0) {
                message = `Task ends in ${Math.ceil(timeDiff / 60000)} minutes`;
            } else {
                message = `Task ended ${Math.ceil(Math.abs(timeDiff) / 60000)} minutes ago`;
            }

            const notification = new Notification(`${todo.description}`, {
                body: message,
                icon: '/notification-icon.png'
            });

            // Add click event to notification
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Play notification sound
            const audio = new Audio('/notification-sound.mp3');
            audio.play().catch(e => console.log("Error playing sound:", e));
        }
    };

    const addTodo = (todo: Omit<Todo, 'id' | 'completed' | 'notified'>) => {
        const newTodo: Todo = {
            ...todo,
            id: Date.now().toString(),
            completed: false,
            notified: false
        };
        setTodos(prevTodos => [...prevTodos, newTodo]);
    };

    const toggleTodo = (id: string) => {
        setTodos(prevTodos =>
            prevTodos.map(todo =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            )
        );
    };

    const deleteTodo = (id: string) => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    };

    // Add function to update a todo
    const updateTodo = (id: string, updatedFields: Partial<Omit<Todo, 'id'>>) => {
        setTodos(prevTodos =>
            prevTodos.map(todo =>
                todo.id === id ? { ...todo, ...updatedFields } : todo
            )
        );
    };

    // Add function to handle drag and drop reordering
    const reorderTodos = (fromId: string, toId: string) => {
        setTodos(prevTodos => {
            const result = [...prevTodos];
            const fromIndex = result.findIndex(todo => todo.id === fromId);
            const toIndex = result.findIndex(todo => todo.id === toId);

            if (fromIndex === -1 || toIndex === -1) return prevTodos;

            // Remove the item from its original position
            const [removed] = result.splice(fromIndex, 1);
            // Insert it at the new position
            result.splice(toIndex, 0, removed);

            // Update positions for all items
            return result.map((todo, index) => ({
                ...todo,
                position: index
            }));
        });
    };

    // Request notification permission on component mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }, []);

    return { todos, addTodo, toggleTodo, deleteTodo, updateTodo, reorderTodos };
}; 