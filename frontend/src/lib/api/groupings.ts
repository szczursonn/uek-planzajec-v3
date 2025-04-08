import * as z from '@zod/mini';
import { createUseAPI } from './common';

const groupingsArraySchema = z.array(z.string().check(z.minLength(1)));
const groupingsResponseSchema = z.object({
    groups: groupingsArraySchema,
    rooms: groupingsArraySchema,
});

export const useGroupingsAPI = createUseAPI(
    () => '/api/groupings',
    (responseData) => groupingsResponseSchema.parse(responseData),
);
