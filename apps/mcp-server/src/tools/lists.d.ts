import { z } from 'zod';
import type { List, ListWithCount, CreateListInput, UpdateListInput } from '@uptier/shared';
export declare const createListSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color?: string | undefined;
    icon?: string | undefined;
    description?: string | undefined;
}, {
    name: string;
    color?: string | undefined;
    icon?: string | undefined;
    description?: string | undefined;
}>;
export declare const updateListSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    color?: string | undefined;
    name?: string | undefined;
    icon?: string | undefined;
    description?: string | null | undefined;
}, {
    id: string;
    color?: string | undefined;
    name?: string | undefined;
    icon?: string | undefined;
    description?: string | null | undefined;
}>;
export declare const deleteListSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const getListsSchema: z.ZodObject<{
    include_smart_lists: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    include_smart_lists: boolean;
}, {
    include_smart_lists?: boolean | undefined;
}>;
export declare const reorderListsSchema: z.ZodObject<{
    list_ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    list_ids: string[];
}, {
    list_ids: string[];
}>;
export declare function createList(input: CreateListInput): List;
export declare function getListById(id: string): List | null;
export declare function getLists(includeSmartLists?: boolean): ListWithCount[];
export declare function updateList(id: string, input: UpdateListInput): List | null;
export declare function deleteList(id: string): boolean;
export declare function reorderLists(listIds: string[]): void;
export declare const listTools: {
    create_list: {
        description: string;
        inputSchema: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            color?: string | undefined;
            icon?: string | undefined;
            description?: string | undefined;
        }, {
            name: string;
            color?: string | undefined;
            icon?: string | undefined;
            description?: string | undefined;
        }>;
        handler: (input: z.infer<typeof createListSchema>) => {
            success: boolean;
            list: List;
        };
    };
    get_lists: {
        description: string;
        inputSchema: z.ZodObject<{
            include_smart_lists: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            include_smart_lists: boolean;
        }, {
            include_smart_lists?: boolean | undefined;
        }>;
        handler: (input: z.infer<typeof getListsSchema>) => {
            success: boolean;
            lists: ListWithCount[];
        };
    };
    update_list: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            icon: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            color?: string | undefined;
            name?: string | undefined;
            icon?: string | undefined;
            description?: string | null | undefined;
        }, {
            id: string;
            color?: string | undefined;
            name?: string | undefined;
            icon?: string | undefined;
            description?: string | null | undefined;
        }>;
        handler: (input: z.infer<typeof updateListSchema>) => {
            success: boolean;
            error: string;
            list?: undefined;
        } | {
            success: boolean;
            list: List;
            error?: undefined;
        };
    };
    delete_list: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof deleteListSchema>) => {
            success: boolean;
            error: string;
        } | {
            success: boolean;
            error?: undefined;
        };
    };
    reorder_lists: {
        description: string;
        inputSchema: z.ZodObject<{
            list_ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            list_ids: string[];
        }, {
            list_ids: string[];
        }>;
        handler: (input: z.infer<typeof reorderListsSchema>) => {
            success: boolean;
        };
    };
};
//# sourceMappingURL=lists.d.ts.map