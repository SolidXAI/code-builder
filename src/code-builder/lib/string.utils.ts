import { upperFirst, camelCase } from 'lodash';

export const classify = (s: string): string => upperFirst(camelCase(s));
