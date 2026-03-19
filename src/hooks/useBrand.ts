/**
 * React hooks for brand data fetching and management
 */
import useSWR from 'swr';
import { api, BrandWithStats, BrandStats, TimelineData, PlatformData, ScanResult } from '@/lib/api';
import { useState, useCallback } from 'react';

// Fetcher functions
const fetchBrands = async (): Promise<BrandWithStats[]> => {
  const response = await api.getBrands();
  if (response.error) throw new Error(response.error);
  return response.data || [];
};

const fetchBrand = async (brandId: string): Promise<BrandWithStats | null> => {
  const response = await api.getBrand(brandId);
  if (response.error) throw new Error(response.error);
  return response.data;
};

const fetchBrandStats = async (brandId: string): Promise<BrandStats | null> => {
  const response = await api.getBrandStats(brandId);
  if (response.error) throw new Error(response.error);
  return response.data;
};

const fetchTimeline = async (brandId: string, days: number): Promise<TimelineData[]> => {
  const response = await api.getMentionTimeline(brandId, days);
  if (response.error) throw new Error(response.error);
  return response.data || [];
};

const fetchPlatforms = async (brandId: string): Promise<PlatformData[]> => {
  const response = await api.getPlatformBreakdown(brandId);
  if (response.error) throw new Error(response.error);
  return response.data || [];
};

/**
 * Hook to fetch all brands for the current user
 */
export function useBrands() {
  const { data, error, isLoading, mutate } = useSWR<BrandWithStats[]>(
    'brands',
    fetchBrands,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    brands: data || [],
    isLoading,
    isError: !!error,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to fetch a single brand with stats
 */
export function useBrand(brandId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BrandWithStats | null>(
    brandId ? `brand-${brandId}` : null,
    () => (brandId ? fetchBrand(brandId) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    brand: data,
    isLoading,
    isError: !!error,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to fetch detailed brand statistics
 */
export function useBrandStats(brandId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BrandStats | null>(
    brandId ? `brand-stats-${brandId}` : null,
    () => (brandId ? fetchBrandStats(brandId) : null),
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    stats: data,
    isLoading,
    isError: !!error,
    error: error?.message,
    refresh: mutate,
  };
}

/**
 * Hook to fetch mention timeline data
 */
export function useMentionTimeline(brandId: string | null, days: number = 30) {
  const { data, error, isLoading } = useSWR<TimelineData[]>(
    brandId ? `timeline-${brandId}-${days}` : null,
    () => (brandId ? fetchTimeline(brandId, days) : []),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    timeline: data || [],
    isLoading,
    isError: !!error,
    error: error?.message,
  };
}

/**
 * Hook to fetch platform breakdown
 */
export function usePlatformBreakdown(brandId: string | null) {
  const { data, error, isLoading } = useSWR<PlatformData[]>(
    brandId ? `platforms-${brandId}` : null,
    () => (brandId ? fetchPlatforms(brandId) : []),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    platforms: data || [],
    isLoading,
    isError: !!error,
    error: error?.message,
  };
}

/**
 * Hook for brand mutations (create, update, delete, scan)
 */
export function useBrandMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBrand = useCallback(async (
    brand: { name: string; domain?: string; keywords?: string[]; industry?: string },
    userId: string
  ): Promise<BrandWithStats | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.createBrand(brand, userId);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBrand = useCallback(async (
    brandId: string,
    updates: Partial<{ name: string; domain: string; keywords: string[]; industry: string; is_active: boolean }>
  ): Promise<BrandWithStats | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.updateBrand(brandId, updates);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBrand = useCallback(async (brandId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.deleteBrand(brandId);
      if (response.error) {
        setError(response.error);
        return false;
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scanBrand = useCallback(async (brandId: string): Promise<ScanResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.scanBrand(brandId);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createBrand,
    updateBrand,
    deleteBrand,
    scanBrand,
    isLoading,
    error,
  };
}
