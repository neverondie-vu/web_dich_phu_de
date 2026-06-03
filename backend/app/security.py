import ipaddress
import os

import requests
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token

from app.config import CORS_ALLOWED_ORIGINS


FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "autosub-a03c4")
FIRESTORE_USER_URL = (
    f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}"
    "/databases/(default)/documents/users/{uid}"
)
GOOGLE_AUTH_REQUEST = GoogleAuthRequest()


def normalize_ip(ip: str) -> str:
    try:
        return str(ipaddress.ip_address(ip.strip()))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Địa chỉ IP không hợp lệ") from exc


def get_request_ip(request: Request) -> str | None:
    if not request.client:
        return None
    try:
        return normalize_ip(request.client.host)
    except HTTPException:
        return request.client.host


def json_response_with_cors(
    request: Request,
    status_code: int,
    content: dict,
    headers: dict | None = None,
) -> JSONResponse:
    response = JSONResponse(status_code=status_code, content=content, headers=headers)
    origin = request.headers.get("origin")
    if origin and origin in CORS_ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response


def get_bearer_token(request: Request) -> str:
    authorization = request.headers.get("authorization") or ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Thiếu Firebase ID token cho khu vực quản trị")
    return token.strip()


def get_firestore_user_role(uid: str, token: str) -> str | None:
    response = requests.get(
        FIRESTORE_USER_URL.format(uid=uid),
        headers={"Authorization": f"Bearer {token}"},
        timeout=8,
    )
    if response.status_code == 404:
        return None
    if response.status_code in {401, 403}:
        raise HTTPException(status_code=403, detail="Không đọc được hồ sơ phân quyền Firestore")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Không kiểm tra được quyền quản trị từ Firestore")
    value = response.json().get("fields", {}).get("role")
    return value.get("stringValue") if isinstance(value, dict) else None


def verify_admin_request(request: Request) -> dict:
    token = get_bearer_token(request)
    try:
        claims = google_id_token.verify_firebase_token(
            token,
            GOOGLE_AUTH_REQUEST,
            audience=FIREBASE_PROJECT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Firebase ID token không hợp lệ hoặc đã hết hạn") from exc

    uid = claims.get("user_id") or claims.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không có định danh người dùng")
    if claims.get("admin") is True or claims.get("role") == "admin":
        return claims
    if get_firestore_user_role(uid, token) != "admin":
        raise HTTPException(status_code=403, detail="Tài khoản không có quyền quản trị")
    return claims
