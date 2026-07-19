from fastapi import HTTPException, Request

from app.config import reload_system_settings, system_settings
from app.security import get_request_ip, json_response_with_cors, verify_admin_request


async def enforce_access_policy(request: Request, call_next):
    reload_system_settings()
    client_ip = get_request_ip(request)
    if client_ip in system_settings.get("blacklisted_ips", []):
        return json_response_with_cors(
            request,
            status_code=403,
            content={"detail": "Địa chỉ IP của bạn đã bị chặn."},
        )

    path = request.url.path
    if path.startswith("/admin") and request.method != "OPTIONS":
        try:
            verify_admin_request(request)
        except HTTPException as exc:
            return json_response_with_cors(
                request,
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

    if system_settings["maintenance_mode"] and request.method != "OPTIONS" and not path.startswith("/admin"):
        return json_response_with_cors(
            request,
            status_code=503,
            content={"detail": "Hệ thống đang bảo trì. Vui lòng quay lại sau."},
            headers={"Retry-After": "3600"},
        )

    return await call_next(request)
