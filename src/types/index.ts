export interface Todo {
    id: string;
    description: string;
    startDate: Date;
    startTime: string;
    endDate: Date;
    endTime: string;
    completed: boolean;
    notified: boolean; // Track if notification was sent for this task
    position?: number; // For drag and drop ordering
} 