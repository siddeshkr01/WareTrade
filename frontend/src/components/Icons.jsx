const base = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
};

export const IconDashboard = (props) => (
    <svg {...base} {...props}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="12" width="8" height="9" rx="1.5" />
        <rect x="3" y="15" width="8" height="6" rx="1.5" />
    </svg>
);

export const IconGodown = (props) => (
    <svg {...base} {...props}>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
    </svg>
);

export const IconRental = (props) => (
    <svg {...base} {...props}>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12 19 4" />
        <path d="M16 4h4v4" />
        <path d="M14 9l2 2" />
    </svg>
);

export const IconProduct = (props) => (
    <svg {...base} {...props}>
        <path d="M20.5 7 12 3 3.5 7 12 11l8.5-4Z" />
        <path d="M3.5 7v10L12 21l8.5-4V7" />
        <path d="M12 11v10" />
    </svg>
);

export const IconTrade = (props) => (
    <svg {...base} {...props}>
        <path d="M4 8h13" />
        <path d="M14 4l3 4-3 4" />
        <path d="M20 16H7" />
        <path d="M10 12l-3 4 3 4" />
    </svg>
);

export const IconLogout = (props) => (
    <svg {...base} {...props}>
        <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
    </svg>
);

export const IconPlus = (props) => (
    <svg {...base} {...props}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
);

export const IconInbox = (props) => (
    <svg {...base} {...props}>
        <path d="M4 12h4l2 3h4l2-3h4" />
        <path d="M5.5 5h13l2 7v6a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-6l2-7Z" />
    </svg>
);

export const IconLoan = (props) => (
    <svg {...base} {...props}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10" />
        <path d="M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5" />
    </svg>
);

export const IconHistory = (props) => (
    <svg {...base} {...props}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v4h4" />
        <path d="M12 8v4l3 2" />
    </svg>
);

export const IconSearch = (props) => (
    <svg {...base} {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
    </svg>
);

export const IconBell = (props) => (
    <svg {...base} {...props}>
        <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
        <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
);
