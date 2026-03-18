const BASE_URL = "http://192.168.29.68:8080";
function authHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : ""
    };
}

/* ================= FINISH QC ================= */
export async function finishQC(qcId) {
    const res = await fetch(
        `${BASE_URL}/api/finished-goods/from-qc/${qcId}`,
        {
            method: "POST",
            headers: authHeaders()
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to finish QC");
    }

    return res.json();
}

/* ================= QC APIs ================= */

export async function getQCRecords(page, size) {
    const res = await fetch(
        `${BASE_URL}/api/qc?page=${page}&size=${size}`,
        {
            headers: authHeaders()
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to load QC records");
    }

    return res.json();
}

/* ================= ADD QC ================= */
export async function addQCRecord(payload, productionOrderId) {
    if (!productionOrderId) {
        throw new Error("Production Order ID missing");
    }

    const res = await fetch(
        `${BASE_URL}/api/qc/inspect/${productionOrderId}`,
        {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(payload)
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to add QC record");
    }

    return res.json();
}
