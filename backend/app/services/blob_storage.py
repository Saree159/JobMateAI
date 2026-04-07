"""
Azure Blob Storage service for resume file storage.
Falls back to returning None when Azure Storage is not configured,
so callers can degrade gracefully to DB-backed storage.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _client():
    """Return a BlobServiceClient or None if not configured."""
    from app.config import settings
    conn = settings.azure_storage_connection_string
    if not conn:
        return None, None
    try:
        from azure.storage.blob import BlobServiceClient
        service = BlobServiceClient.from_connection_string(conn)
        container = service.get_container_client(settings.azure_storage_container)
        # Create container if it doesn't exist
        try:
            container.create_container()
        except Exception:
            pass  # already exists
        return service, container
    except Exception as e:
        logger.warning(f"Azure Blob Storage unavailable: {e}")
        return None, None


def upload_resume(user_id: int, filename: str, content: bytes) -> Optional[str]:
    """
    Upload resume bytes to Azure Blob Storage.
    Returns the blob name (used as the storage key) on success, None if unavailable.
    """
    _, container = _client()
    if container is None:
        return None

    blob_name = f"user_{user_id}/{filename}"
    try:
        container.upload_blob(blob_name, content, overwrite=True)
        logger.info(f"Resume uploaded to blob: {blob_name}")
        return blob_name
    except Exception as e:
        logger.error(f"Blob upload failed for user {user_id}: {e}")
        return None


def download_resume(blob_name: str) -> Optional[bytes]:
    """
    Download resume bytes from Azure Blob Storage.
    Returns bytes on success, None if unavailable or not found.
    """
    _, container = _client()
    if container is None:
        return None

    try:
        blob = container.get_blob_client(blob_name)
        return blob.download_blob().readall()
    except Exception as e:
        logger.error(f"Blob download failed for {blob_name}: {e}")
        return None


def delete_resume(blob_name: str) -> None:
    """Delete a resume blob. Silently ignores errors."""
    _, container = _client()
    if container is None:
        return
    try:
        container.delete_blob(blob_name)
    except Exception:
        pass
