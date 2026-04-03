// Common utility functions space
// Feel free to add and export specific utilities (formatters, parsers mapped from Vue version) here

export const getLocalStorage = (key) => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.warn('Error reading from localStorage', error);
        return null;
    }
};

export const setLocalStorage = (key, value) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Error writing to localStorage', error);
    }
};

export const clearLocalStorage = () => {
    window.localStorage.clear();
};
