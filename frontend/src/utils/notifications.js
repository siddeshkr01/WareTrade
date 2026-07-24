import API from "../api/axios";

export const markNotificationsReadByLink = (links) => {
    const list = Array.isArray(links) ? links : [links];
    if (list.length === 0) return;
    API.post("/notification/mark-read-by-link", { links: list }).catch(() => {});
};
