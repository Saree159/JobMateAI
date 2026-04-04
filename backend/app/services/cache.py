"""
Caching service for JobMate AI.
Supports Redis with automatic fallback to in-memory cache.
Azure-compatible (works with Azure Cache for Redis).
"""
import json
import logging
from typing import Optional, Any
from datetime import timedelta
import time

logger = logging.getLogger(__name__)

# Try to import Redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, using in-memory cache")


class CacheService:
    """
    Unified cache service that supports:
    - Redis (production, Azure Cache for Redis)
    - In-memory fallback (development)
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        self.memory_cache = {}  # Fallback cache
        self.cache_timestamps = {}  # Track TTL for memory cache
        
        if REDIS_AVAILABLE and redis_url:
            try:
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5
                )
                # Test connection
                self.redis_client.ping()
                logger.info(f"✓ Redis connected: {redis_url}")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Using in-memory cache.")
                self.redis_client = None
        else:
            logger.info("Using in-memory cache (Redis not configured)")
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            if self.redis_client:
                # Redis cache
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
            else:
                # Memory cache with TTL check
                if key in self.memory_cache:
                    timestamp, ttl, value = self.memory_cache[key]
                    if time.time() - timestamp < ttl:
                        return value
                    else:
                        # Expired
                        del self.memory_cache[key]
                return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 1800) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default 30 minutes)
        """
        try:
            if self.redis_client:
                # Redis cache
                serialized = json.dumps(value)
                self.redis_client.setex(key, ttl, serialized)
                return True
            else:
                # Memory cache
                self.memory_cache[key] = (time.time(), ttl, value)
                return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            if self.redis_client:
                self.redis_client.delete(key)
            else:
                if key in self.memory_cache:
                    del self.memory_cache[key]
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False

    def delete_pattern(self, prefix: str) -> int:
        """Delete all keys that start with prefix. Returns count deleted."""
        count = 0
        try:
            if self.redis_client:
                keys = list(self.redis_client.scan_iter(f"{prefix}*"))
                if keys:
                    count = self.redis_client.delete(*keys)
            else:
                to_delete = [k for k in list(self.memory_cache) if k.startswith(prefix)]
                for k in to_delete:
                    del self.memory_cache[k]
                count = len(to_delete)
        except Exception as e:
            logger.error(f"Cache delete_pattern error for prefix '{prefix}': {e}")
        return count
    
    def clear(self) -> bool:
        """Clear all cache."""
        try:
            if self.redis_client:
                self.redis_client.flushdb()
            else:
                self.memory_cache.clear()
                self.cache_timestamps.clear()
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    def get_stats(self) -> dict:
        """Get cache statistics."""
        try:
            if self.redis_client:
                info = self.redis_client.info('stats')
                return {
                    "backend": "redis",
                    "total_keys": self.redis_client.dbsize(),
                    "hits": info.get('keyspace_hits', 0),
                    "misses": info.get('keyspace_misses', 0),
                }
            else:
                return {
                    "backend": "memory",
                    "total_keys": len(self.memory_cache),
                    "hits": "N/A",
                    "misses": "N/A",
                }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"error": str(e)}


# Global cache instance
_cache_service: Optional[CacheService] = None


def get_cache() -> CacheService:
    """Get or create cache service singleton."""
    global _cache_service
    if _cache_service is None:
        # Try to get Redis URL from config
        try:
            from app.config import settings
            redis_url = settings.redis_url
        except:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        _cache_service = CacheService(redis_url)
    return _cache_service


# Cache key generators
def make_jobs_cache_key(source: str, category: str) -> str:
    """Generate cache key for job listings."""
    return f"jobs:{source}:{category}"


def make_job_cache_key(source: str, job_id: str) -> str:
    """Generate cache key for individual job."""
    return f"job:{source}:{job_id}"
