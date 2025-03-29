import { useState, useRef, useEffect } from 'react';
import { useClock } from '../hooks/useClock';
import { Todo } from '../types';

interface AnalogClockProps {
    todos: Todo[];
    onTimeSelection: (startHour: number, startMinute: number, endHour: number, endMinute: number, rotationCount: number) => void;
    initialStartHour?: number;
    initialStartMinute?: number;
    initialEndHour?: number;
    initialEndMinute?: number;
    daysToAdd?: number;
    onSubmit: (todo: Omit<Todo, 'id' | 'completed' | 'notified'>) => void;
    onCancel: () => void;
}

const AnalogClock: React.FC<AnalogClockProps> = ({ todos, onTimeSelection, initialStartHour, initialStartMinute, initialEndHour, initialEndMinute, daysToAdd = 0, onSubmit, onCancel }) => {
    const currentTime = useClock();
    const [hoveredPosition, setHoveredPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragAngle, setDragAngle] = useState<number | null>(null);
    const [dragHour, setDragHour] = useState<number | null>(null);
    const [dragMinute, setDragMinute] = useState<number | null>(null);

    // Added for the start/end time selection
    const [selectionPhase, setSelectionPhase] = useState<'none' | 'start-selected' | 'completed'>('none');
    const [startHour, setStartHour] = useState<number | null>(null);
    const [startMinute, setStartMinute] = useState<number | null>(null);
    const [startAngle, setStartAngle] = useState<number | null>(null);
    const [endHour, setEndHour] = useState<number | null>(null);
    const [endMinute, setEndMinute] = useState<number | null>(null);

    // TodoForm state
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [hasTimeSelection, setHasTimeSelection] = useState(false);
    const [isMultiDay, setIsMultiDay] = useState(false);

    const clockRef = useRef<SVGSVGElement>(null);

    // Extract hours, minutes, and seconds
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();

    // Calculate the angles for clock hands
    const hourAngle = (hours * 30) + (minutes * 0.5); // 30 degrees per hour, 0.5 degrees per minute
    const minuteAngle = minutes * 6; // 6 degrees per minute
    const secondAngle = seconds * 6; // 6 degrees per second

    // Set up dimensions
    const size = 300;
    const center = size / 2;
    const radius = center - 10;

    // Helper function to format time with AM/PM
    const formatTime = (hour: number, minute: number): string => {
        // Convert to 24-hour format based on current time
        const now = new Date();
        const currentHour = now.getHours();
        const currentPeriod = currentHour < 12 ? 'AM' : 'PM';

        // Determine if the selected hour should be AM or PM
        // For the analog clock with 12-hour face, we need to determine based on context
        let isPM = false;

        // If the angle represents a time in the same period as current time
        if (hour < 12 && currentPeriod === 'PM') {
            isPM = true;
        }

        // If we've rotated the clock (for multi-day tasks), adjust PM/AM accordingly
        if (rotationCount > 0) {
            // Each day adds 24 hours
            const hoursWith24Format = hour + (rotationCount * 24);
            const periodIndex = Math.floor(hoursWith24Format / 12) % 2;
            isPM = periodIndex === 1;
        }

        const displayHour = hour === 0 ? 12 : hour;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    };

    // Filter todos for today
    const todayTodos = todos.filter(todo => {
        const today = currentTime.toDateString();
        const todoStartDate = todo.startDate.toDateString();
        const todoEndDate = todo.endDate.toDateString();

        // Include tasks that:
        // 1. Start today
        // 2. End today
        // 3. Span today (started before, ends after)
        return todoStartDate === today ||
            todoEndDate === today ||
            (todo.startDate < currentTime && todo.endDate > currentTime);
    });

    // Calculate the angle for each todo based on its time
    const todoMarkers = todayTodos.map(todo => {
        // For multi-day tasks, adjust display based on the current day
        const today = currentTime.toDateString();
        const todoStartDate = todo.startDate.toDateString();
        const todoEndDate = todo.endDate.toDateString();

        let displayStartTime = todo.startTime;
        let displayEndTime = todo.endTime;

        // If task started before today, set start to 00:00
        if (todo.startDate < currentTime && todoStartDate !== today) {
            displayStartTime = "00:00";
        }

        // If task ends after today, set end to 23:59
        if (todo.endDate > currentTime && todoEndDate !== today) {
            displayEndTime = "23:59";
        }

        // Start time marker
        const [startHours, startMinutes] = displayStartTime.split(':').map(Number);
        const startAngle = (startHours % 12) * 30 + (startMinutes * 0.5);

        // End time marker
        const [endHours, endMinutes] = displayEndTime.split(':').map(Number);
        const endAngle = (endHours % 12) * 30 + (endMinutes * 0.5);

        // Calculate positions on the clock face
        const startX = center + (radius - 25) * Math.sin((startAngle * Math.PI) / 180);
        const startY = center - (radius - 25) * Math.cos((startAngle * Math.PI) / 180);

        const endX = center + (radius - 25) * Math.sin((endAngle * Math.PI) / 180);
        const endY = center - (radius - 25) * Math.cos((endAngle * Math.PI) / 180);

        // Check if the task spans multiple 12-hour periods
        const isMultiDay = todo.startDate.toDateString() !== todo.endDate.toDateString();
        const fullTimeStart = startHours + (startMinutes / 60);
        const fullTimeEnd = endHours + (endMinutes / 60);
        const spansMultiplePeriods = isMultiDay ||
            (Math.floor(fullTimeStart / 12) !== Math.floor(fullTimeEnd / 12));

        return {
            id: todo.id,
            description: todo.description,
            startX,
            startY,
            endX,
            endY,
            startAngle,
            endAngle,
            isMultiDay,
            spansMultiplePeriods,
            startTime: todo.startTime,
            endTime: todo.endTime,
            startDate: todo.startDate,
            endDate: todo.endDate,
            completed: todo.completed
        };
    });

    const calculateAngleAndTime = (x: number, y: number) => {
        // Calculate angle from center to click point
        const dx = x - center;
        const dy = center - y;
        let angle = Math.atan2(dx, dy) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // Snap to 5-minute intervals (30 degrees / 12 hours = 2.5 degrees per 5 minutes)
        const snapAngle = Math.round(angle / 2.5) * 2.5;

        // Convert angle to hours and minutes
        const totalMinutes = Math.round(snapAngle * 2); // 2 minutes per degree
        const hours = Math.floor(totalMinutes / 60) % 12;
        // Snap to 5-minute intervals
        const minutes = Math.round(totalMinutes % 60 / 5) * 5;

        return { angle: snapAngle, hours, minutes };
    };

    const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isDragging) {
            // If we're already dragging, complete the selection
            if (selectionPhase === 'start-selected' &&
                startHour !== null && startMinute !== null &&
                endHour !== null && endMinute !== null) {

                setSelectionPhase('completed');
                setIsDragging(false);

                // Pass both start and end times to the parent component, along with days to add
                onTimeSelection(startHour, startMinute, endHour, endMinute, rotationCount);

                // Keep the selection visible instead of resetting
                // The resetTimeSelection() call is removed here
            }
            return;
        }

        // Get coordinates relative to the SVG element
        const svgRect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;

        const { angle, hours, minutes } = calculateAngleAndTime(x, y);

        // First click sets the start time and starts dragging
        if (selectionPhase === 'none') {
            setStartHour(hours);
            setStartMinute(minutes);
            setStartAngle(angle);
            setSelectionPhase('start-selected');
            // Set initial end time same as start (will be changed by dragging)
            setEndHour(hours);
            setEndMinute(minutes);
            setDragAngle(angle);
            setIsDragging(true);
            setLastAngle(angle);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!clockRef.current || selectionPhase !== 'start-selected') return;

        // Get coordinates relative to the SVG element
        const svgRect = clockRef.current.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;

        // Check if within the clock face
        const distanceFromCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
        if (distanceFromCenter <= radius) {
            setIsDragging(true);
            const { angle, hours, minutes } = calculateAngleAndTime(x, y);
            setDragAngle(angle);
            setEndHour(hours);
            setEndMinute(minutes);
            setLastAngle(angle);

            // Prevent text selection while dragging
            e.preventDefault();
        }
    };

    const [rotationCount, setRotationCount] = useState(0);
    const [lastAngle, setLastAngle] = useState<number | null>(null);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!clockRef.current) return;

        const svgRect = clockRef.current.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;

        // Only update if within the clock face
        const distanceFromCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
        if (distanceFromCenter <= radius) {
            setHoveredPosition({ x, y });

            if (isDragging && selectionPhase === 'start-selected') {
                const { angle, hours, minutes } = calculateAngleAndTime(x, y);
                setDragAngle(angle);
                setEndHour(hours);
                setEndMinute(minutes);

                // Track rotations for multi-day tasks
                if (lastAngle !== null) {
                    // Detect crossing from 359 to 0 degrees (clockwise)
                    if (lastAngle > 270 && angle < 90) {
                        setRotationCount(prev => prev + 1);
                    }
                    // Detect crossing from 0 to 359 degrees (counter-clockwise)
                    else if (lastAngle < 90 && angle > 270) {
                        setRotationCount(prev => Math.max(0, prev - 1));
                    }
                }

                setLastAngle(angle);
            }
        } else {
            setHoveredPosition(null);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
        // Don't complete selection on mouse up, wait for click
        if (isDragging) {
            e.preventDefault();
        }
    };

    const handleMouseLeave = () => {
        setHoveredPosition(null);
        // Don't complete selection on mouse leave, wait for click
        if (isDragging) {
            // Keep the current selection state
            return;
        }
    };

    const resetSelectionState = () => {
        setSelectionPhase('none');
        setStartHour(null);
        setStartMinute(null);
        setStartAngle(null);
        setEndHour(null);
        setEndMinute(null);
        setDragAngle(null);
        setIsDragging(false);
        setRotationCount(0);
        setLastAngle(null);
    };

    // Calculate arc path between start and end angles
    const getArcPath = (startAngle: number, endAngle: number, radius: number, spansMultiplePeriods: boolean = false) => {
        // For tasks spanning multiple 12-hour periods, we need to draw a full arc
        if (spansMultiplePeriods) {
            // For tasks spanning across the 12 hour boundary, draw a full circle
            // with small gaps at the start and end points
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const startX = center + radius * Math.sin(startRad);
            const startY = center - radius * Math.cos(startRad);
            const endX = center + radius * Math.sin(endRad);
            const endY = center - radius * Math.cos(endRad);

            // Draw a nearly full circle, ensuring it goes the long way around
            return `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;
        }

        // Ensure endAngle is greater than startAngle for proper arc drawing
        let adjustedEndAngle = endAngle;
        if (endAngle < startAngle) {
            adjustedEndAngle += 360;
        }

        // Convert to radians
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (adjustedEndAngle * Math.PI) / 180;

        // Calculate points
        const startX = center + radius * Math.sin(startRad);
        const startY = center - radius * Math.cos(startRad);
        const endX = center + radius * Math.sin(endRad);
        const endY = center - radius * Math.cos(endRad);

        // Choose the shorter arc by default
        const arcSweep = adjustedEndAngle - startAngle <= 180 ? 0 : 1;

        return `M ${startX} ${startY} A ${radius} ${radius} 0 ${arcSweep} 1 ${endX} ${endY}`;
    };

    // Format time to 12-hour format with AM/PM for TodoForm
    const formatTimeWithAMPM = (timeString: string): string => {
        const [hoursStr, minutesStr] = timeString.split(':');
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM

        return `${displayHours}:${minutesStr} ${period}`;
    };

    // Format date in a more readable format
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // TodoForm effect for handling time selection
    useEffect(() => {
        const hasSelection = initialStartHour !== undefined &&
            initialStartMinute !== undefined &&
            initialEndHour !== undefined &&
            initialEndMinute !== undefined;

        setHasTimeSelection(hasSelection);

        if (initialStartHour !== undefined && initialStartMinute !== undefined) {
            // Format hours and minutes to HH:MM
            const formattedStartHour = initialStartHour.toString().padStart(2, '0');
            const formattedStartMinute = initialStartMinute.toString().padStart(2, '0');
            setStartTime(`${formattedStartHour}:${formattedStartMinute}`);
        }

        if (initialEndHour !== undefined && initialEndMinute !== undefined) {
            // Format hours and minutes to HH:MM
            const formattedEndHour = initialEndHour.toString().padStart(2, '0');
            const formattedEndMinute = initialEndMinute.toString().padStart(2, '0');
            setEndTime(`${formattedEndHour}:${formattedEndMinute}`);

            // If days to add is greater than 0, enable multi-day mode and calculate end date
            if (daysToAdd > 0) {
                setIsMultiDay(true);
                const startDateObj = new Date(startDate);
                const endDateObj = new Date(startDateObj);
                endDateObj.setDate(startDateObj.getDate() + daysToAdd);
                setEndDate(endDateObj.toISOString().split('T')[0]);
            }
        }
    }, [initialStartHour, initialStartMinute, initialEndHour, initialEndMinute, daysToAdd, startDate]);

    // TodoForm handlers
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            alert('Please enter a task description');
            return;
        }

        // Check if end datetime is after start datetime
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (startDateTime >= endDateTime) {
            alert('End time must be after start time');
            return;
        }

        onSubmit({
            description: description.trim(),
            startDate: new Date(startDate),
            startTime,
            endDate: new Date(endDate),
            endTime
        });

        // Reset form
        setDescription('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setStartTime('');
        setEndTime('');
        setIsMultiDay(false);

        // Reset clock selection state
        resetSelectionState();
    };

    const handleClearSelection = () => {
        onCancel();
    };

    const toggleMultiDay = () => {
        setIsMultiDay(!isMultiDay);
    };

    const calculateDuration = () => {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        if (startDateTime >= endDateTime) return "Invalid time range";

        const diffMs = endDateTime.getTime() - startDateTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 24) {
            const days = Math.floor(diffHours / 24);
            const hours = diffHours % 24;
            return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        }

        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    };

    const getTimeRangeDisplay = () => {
        const startTimeFormatted = formatTimeWithAMPM(startTime);
        const endTimeFormatted = formatTimeWithAMPM(endTime);

        if (startDate === endDate || !isMultiDay) {
            // Same day
            return `${formatDate(startDate)}, ${startTimeFormatted} - ${endTimeFormatted}`;
        } else {
            // Different days
            return `${formatDate(startDate)}, ${startTimeFormatted} - ${formatDate(endDate)}, ${endTimeFormatted}`;
        }
    };

    return (
        <div className="clock-container">
            <svg
                ref={clockRef}
                width={size}
                height={size}
                onClick={handleClockClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                {/* Clock face */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="var(--clock-face)"
                    stroke="var(--clock-border)"
                    strokeWidth="2"
                />

                {/* Hour markers with numbers */}
                {[...Array(12)].map((_, i) => {
                    const hour = i === 0 ? 12 : i;
                    const angle = (i * 30 * Math.PI) / 180;
                    const x1 = center + (radius - 10) * Math.sin(angle);
                    const y1 = center - (radius - 10) * Math.cos(angle);
                    const x2 = center + radius * Math.sin(angle);
                    const y2 = center - radius * Math.cos(angle);

                    // Position for hour numbers (slightly inside the markers)
                    const numX = center + (radius - 25) * Math.sin(angle);
                    const numY = center - (radius - 25) * Math.cos(angle);

                    return (
                        <g key={i}>
                            <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="var(--clock-border)"
                                strokeWidth="2"
                            />
                            <text
                                x={numX}
                                y={numY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="12"
                                fill="var(--text-color)"
                                fontWeight="bold"
                            >
                                {hour}
                            </text>
                        </g>
                    );
                })}

                {/* Todo time range arcs */}
                {todoMarkers.map(marker => (
                    <g key={`arc-${marker.id}`}>
                        <path
                            d={getArcPath(marker.startAngle, marker.endAngle, radius - 25, marker.spansMultiplePeriods)}
                            fill="none"
                            stroke={marker.completed ? "rgba(103, 201, 98, 0.6)" : "rgba(233, 76, 61, 0.6)"}
                            strokeWidth="5"
                            strokeLinecap="round"
                        />
                        <circle
                            cx={marker.startX}
                            cy={marker.startY}
                            r={5}
                            fill={marker.completed ? "green" : "red"}
                            stroke="none"
                        >
                            <title>
                                {marker.description}
                                {marker.isMultiDay ?
                                    ` (Start: ${marker.startDate.toLocaleDateString()} ${marker.startTime})` :
                                    ` (Start: ${marker.startTime})`}
                            </title>
                        </circle>
                        <circle
                            cx={marker.endX}
                            cy={marker.endY}
                            r={5}
                            fill={marker.completed ? "green" : "red"}
                            stroke="white"
                            strokeWidth="2"
                        >
                            <title>
                                {marker.description}
                                {marker.isMultiDay ?
                                    ` (End: ${marker.endDate.toLocaleDateString()} ${marker.endTime})` :
                                    ` (End: ${marker.endTime})`}
                            </title>
                        </circle>
                        {marker.isMultiDay && (
                            <text
                                x={center}
                                y={center - 50}
                                textAnchor="middle"
                                fontSize="10"
                                fill={marker.completed ? "green" : "red"}
                                className="multi-day-task-indicator"
                                style={{ opacity: 0.7 }}
                            >
                                Multi-day task
                            </text>
                        )}
                    </g>
                ))}

                {/* Hour hand */}
                <line
                    x1={center}
                    y1={center}
                    x2={center + (radius * 0.5) * Math.sin((hourAngle * Math.PI) / 180)}
                    y2={center - (radius * 0.5) * Math.cos((hourAngle * Math.PI) / 180)}
                    stroke="var(--clock-hands)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* Minute hand */}
                <line
                    x1={center}
                    y1={center}
                    x2={center + (radius * 0.7) * Math.sin((minuteAngle * Math.PI) / 180)}
                    y2={center - (radius * 0.7) * Math.cos((minuteAngle * Math.PI) / 180)}
                    stroke="var(--clock-hands)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Second hand */}
                <line
                    x1={center}
                    y1={center}
                    x2={center + (radius * 0.8) * Math.sin((secondAngle * Math.PI) / 180)}
                    y2={center - (radius * 0.8) * Math.cos((secondAngle * Math.PI) / 180)}
                    stroke="var(--clock-second)"
                    strokeWidth="1"
                    strokeLinecap="round"
                />

                {/* Start time marker */}
                {(selectionPhase === 'start-selected' || selectionPhase === 'completed') && startAngle !== null && (
                    <circle
                        cx={center + (radius * 0.9) * Math.sin((startAngle * Math.PI) / 180)}
                        cy={center - (radius * 0.9) * Math.cos((startAngle * Math.PI) / 180)}
                        r={8}
                        fill="#4a90e2"
                        stroke="white"
                        strokeWidth="2"
                    />
                )}

                {/* Time range arc (shown during selection) */}
                {(selectionPhase === 'start-selected' || selectionPhase === 'completed') && startAngle !== null && dragAngle !== null && (
                    <path
                        d={getArcPath(startAngle, dragAngle, radius - 15)}
                        fill="none"
                        stroke="rgba(74, 144, 226, 0.5)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={selectionPhase === 'completed' ? "none" : "5,3"}
                    />
                )}

                {/* Drag hand (visible during dragging) */}
                {(isDragging || selectionPhase === 'completed') && dragAngle !== null && (
                    <line
                        x1={center}
                        y1={center}
                        x2={center + (radius * 0.9) * Math.sin((dragAngle * Math.PI) / 180)}
                        y2={center - (radius * 0.9) * Math.cos((dragAngle * Math.PI) / 180)}
                        stroke="#4a90e2"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={selectionPhase === 'completed' ? "none" : "5,3"}
                    />
                )}

                {/* Center dot */}
                <circle
                    cx={center}
                    cy={center}
                    r={4}
                    fill="var(--clock-hands)"
                />

                {/* Hover indicator */}
                {(hoveredPosition && !isDragging && selectionPhase === 'none') && (
                    <circle
                        cx={hoveredPosition.x}
                        cy={hoveredPosition.y}
                        r={3}
                        fill="rgba(0, 0, 255, 0.3)"
                    />
                )}

                {/* Drag indicator (larger than hover indicator) */}
                {(isDragging || selectionPhase === 'completed') && dragAngle !== null && (
                    <circle
                        cx={center + (radius * 0.9) * Math.sin((dragAngle * Math.PI) / 180)}
                        cy={center - (radius * 0.9) * Math.cos((dragAngle * Math.PI) / 180)}
                        r={8}
                        fill="#4a90e2"
                        stroke="white"
                        strokeWidth="2"
                    />
                )}

                {/* Rotation count indicator */}
                {(isDragging || selectionPhase === 'completed') && rotationCount > 0 && (
                    <text
                        x={center}
                        y={center + 50}
                        textAnchor="middle"
                        fontSize="14"
                        fill="#4a90e2"
                        fontWeight="bold"
                    >
                        +{rotationCount} day{rotationCount > 1 ? 's' : ''}
                    </text>
                )}
            </svg>
            <div className="current-time">
                {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>

            {selectionPhase === 'none' && (
                <div className="selection-instruction">
                    Click to set start time
                </div>
            )}

            {(selectionPhase === 'start-selected' || selectionPhase === 'completed') && startHour !== null && startMinute !== null && (
                <div className="selection-info" style={{ display: 'flex', alignItems: 'center', verticalAlign: 'middle', paddingRight: '0px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div>
                            Start: {formatTime(startHour, startMinute)}
                            {(isDragging || selectionPhase === 'completed') && endHour !== null && endMinute !== null && (
                                <span>
                                    {" → "}End: {formatTime(endHour, endMinute)}
                                    {rotationCount > 0 && (
                                        <span className="day-indicator">(+{rotationCount} day{rotationCount > 1 ? 's' : ''})</span>
                                    )}
                                </span>
                            )}
                            {!isDragging && selectionPhase === 'start-selected' && <span className="drag-instruction"> (drag to set end time)</span>}
                        </div>
                        {(startDate && endDate && startTime && endTime) && (
                            <div className="duration-info">
                                <span>{calculateDuration()}</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="clear-selection-btn"
                        onClick={resetSelectionState}
                        aria-label="Clear time selection"
                        style={{ position: 'relative', transform: 'none', marginLeft: '16px' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* TodoForm */}
            <div className="todo-form-container">
                <form onSubmit={handleFormSubmit}>
                    <div className="form-group">
                        <label htmlFor="description">Task Description:</label>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What do you need to do?"
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={handleClearSelection} className="clear-btn">Clear</button>
                        <button type="submit">Add Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AnalogClock; 