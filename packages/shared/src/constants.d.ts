import type { PrioritizationStrategy, SmartListFilter } from './types.js';
export declare const DB_FILENAME = "tasks.db";
export declare const DB_DIRECTORY = ".uptier";
export declare const PRIORITY_SCALES: {
    readonly effort: {
        readonly 1: {
            readonly label: "Trivial";
            readonly description: "Under 15 minutes, no thought required";
        };
        readonly 2: {
            readonly label: "Easy";
            readonly description: "15-60 minutes, straightforward";
        };
        readonly 3: {
            readonly label: "Moderate";
            readonly description: "1-4 hours, some complexity";
        };
        readonly 4: {
            readonly label: "Substantial";
            readonly description: "Half day to full day, significant work";
        };
        readonly 5: {
            readonly label: "Major";
            readonly description: "Multi-day project, substantial effort";
        };
    };
    readonly impact: {
        readonly 1: {
            readonly label: "Minimal";
            readonly description: "Nice to have, minimal consequence";
        };
        readonly 2: {
            readonly label: "Low";
            readonly description: "Helpful, some benefit";
        };
        readonly 3: {
            readonly label: "Medium";
            readonly description: "Important, clear value";
        };
        readonly 4: {
            readonly label: "High";
            readonly description: "High value, significant outcomes";
        };
        readonly 5: {
            readonly label: "Critical";
            readonly description: "Critical, transformative results";
        };
    };
    readonly urgency: {
        readonly 1: {
            readonly label: "Someday";
            readonly description: "Someday/maybe, no deadline";
        };
        readonly 2: {
            readonly label: "This Month";
            readonly description: "This month";
        };
        readonly 3: {
            readonly label: "This Week";
            readonly description: "This week";
        };
        readonly 4: {
            readonly label: "Soon";
            readonly description: "Next few days";
        };
        readonly 5: {
            readonly label: "Urgent";
            readonly description: "Today/overdue";
        };
    };
    readonly importance: {
        readonly 1: {
            readonly label: "Optional";
            readonly description: "Would be fine if never done";
        };
        readonly 2: {
            readonly label: "Low Stakes";
            readonly description: "Low stakes";
        };
        readonly 3: {
            readonly label: "Meaningful";
            readonly description: "Matters to goals";
        };
        readonly 4: {
            readonly label: "Significant";
            readonly description: "Significant to success";
        };
        readonly 5: {
            readonly label: "Critical";
            readonly description: "Core to mission/values";
        };
    };
};
export declare const PRIORITY_TIERS: {
    readonly 1: {
        readonly label: "Do Now";
        readonly description: "High impact, urgent, or blocking others";
        readonly color: "#ef4444";
    };
    readonly 2: {
        readonly label: "Do Soon";
        readonly description: "Important but not urgent, scheduled";
        readonly color: "#f59e0b";
    };
    readonly 3: {
        readonly label: "Backlog";
        readonly description: "Low priority, someday/maybe";
        readonly color: "#6b7280";
    };
};
export declare const PRIORITIZATION_STRATEGIES: Record<PrioritizationStrategy, {
    label: string;
    description: string;
    prompt_hint: string;
}>;
export declare const DEFAULT_SMART_LISTS: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    filter: SmartListFilter;
}>;
export declare const DEFAULT_LIST_ICON = "list";
export declare const DEFAULT_LIST_COLOR = "#3b82f6";
export declare const DEFAULT_TAG_COLOR = "#6b7280";
export declare const CONTEXT_TAGS: readonly [{
    readonly id: "deep_work";
    readonly label: "Deep Work";
    readonly description: "Requires focused, uninterrupted time";
}, {
    readonly id: "quick_win";
    readonly label: "Quick Win";
    readonly description: "Can be done in a few minutes";
}, {
    readonly id: "waiting_on";
    readonly label: "Waiting On";
    readonly description: "Blocked by someone/something else";
}, {
    readonly id: "low_energy";
    readonly label: "Low Energy";
    readonly description: "Can do when tired";
}, {
    readonly id: "high_energy";
    readonly label: "High Energy";
    readonly description: "Needs peak mental state";
}, {
    readonly id: "meeting";
    readonly label: "Meeting";
    readonly description: "Requires scheduling with others";
}, {
    readonly id: "research";
    readonly label: "Research";
    readonly description: "Information gathering";
}, {
    readonly id: "creative";
    readonly label: "Creative";
    readonly description: "Requires creative thinking";
}, {
    readonly id: "admin";
    readonly label: "Admin";
    readonly description: "Administrative/paperwork";
}];
export declare const ENERGY_LEVELS: {
    readonly low: {
        readonly label: "Low Energy";
        readonly description: "Can do when tired or distracted";
    };
    readonly medium: {
        readonly label: "Medium Energy";
        readonly description: "Normal working state";
    };
    readonly high: {
        readonly label: "High Energy";
        readonly description: "Requires peak focus and energy";
    };
};
export declare const TIMEFRAMES: {
    readonly daily: {
        readonly label: "Daily";
        readonly description: "Recurring daily goals";
    };
    readonly weekly: {
        readonly label: "Weekly";
        readonly description: "Week-by-week objectives";
    };
    readonly monthly: {
        readonly label: "Monthly";
        readonly description: "Monthly milestones";
    };
    readonly quarterly: {
        readonly label: "Quarterly";
        readonly description: "90-day goals";
    };
    readonly yearly: {
        readonly label: "Yearly";
        readonly description: "Annual objectives";
    };
};
//# sourceMappingURL=constants.d.ts.map