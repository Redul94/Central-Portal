export type Machine = {
    id: number;
    name: string;
    location: string;
    ip: string;
    url: string;
    category: string;
    manual: string;
    remarks: string;
};

export const machines: Machine[] = [
    {
        id: 1,
        name: "Dyeing M/C Sample - 09",
        location: "Knitting Washing",
        ip: "10.77.18.9",
        url: "http://10.77.18.9:10123/UserInterface/",
        category: "Dyeing",
        manual: "Installation Manual",
        remarks: "",
    },
    {
        id: 2,
        name: "Dyeing M/C Sample - 10",
        location: "Knitting Washing",
        ip: "10.77.18.10",
        url: "http://10.77.18.10:10123/UserInterface/",
        category: "Dyeing",
        manual: "Installation Manual",
        remarks: "",
    },
    {
        id: 3,
        name: "Dyeing M/C - 09",
        location: "Old Washing Shed",
        ip: "10.77.18.11",
        url: "http://10.77.18.11:10123/UserInterface/",
        category: "Dyeing",
        manual: "Installation Manual",
        remarks: "",
    },
    {
        id: 4,
        name: "Dyeing M/C - 10",
        location: "Old Washing Shed",
        ip: "10.77.18.12",
        url: "http://10.77.18.12:10123/UserInterface/",
        category: "Dyeing",
        manual: "Installation Manual",
        remarks: "",
    },
    {
        id: 5,
        name: "Dyeing M/C - 11",
        location: "Old Washing Shed",
        ip: "10.77.18.13",
        url: "http://10.77.18.13:10123/UserInterface/",
        category: "Dyeing",
        manual: "Installation Manual",
        remarks: "",
    },
    {
        id: 6,
        name: "Dyeing M/C - 12",
        location: "Old Washing Shed",
        ip: "10.77.18.14",
        url: "http://10.77.18.14:10123/UserInterface/",
        category: "Dyeing",
        manual: "Installation Manual",
        remarks: "",
    },
    {
        id: 7,
        name: "Flow Meter",
        location: "Booster Room",
        ip: "10.77.18.18",
        url: "http://10.77.18.18/",
        category: "Utility",
        manual: "",
        remarks: "",
    },
    {
        id: 8,
        name: "Scada M/C",
        location: "Utility Building - Control Room",
        ip: "10.77.13.99",
        url: "https://web.eu.v-iec.com/browse?projectId=5534&t=14e18e29c21c446f97ab0f4053b7e6d8&uid=1008700&lang=en_US",
        category: "SCADA",
        manual: "",
        remarks: "",
    },
    {
        id: 9,
        name: "Pleva - Stenter Machine",
        location: "Stenter Machine",
        ip: "10.77.18.3",
        url: "http://10.77.18.3",
        category: "Stenter",
        manual: "Pleva Manual",
        remarks: "Port: 5500",
    },
    {
        id: 10,
        name: "Rooftop Solar",
        location: "RoofTop",
        ip: "",
        url: "https://intl.fusionsolar.huawei.com/pvmswebsite/login/build/index.html",
        category: "Solar",
        manual: "",
        remarks: "",
    },
];