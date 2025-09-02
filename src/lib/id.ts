import { v7 } from "uuid";

// Central ID generator
export const newId = (): string => v7();

export default newId;
