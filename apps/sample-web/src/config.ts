const rawBasePath = import.meta.env.VITE_BASE_PATH ?? '/';

export const BASE_PATH = rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
