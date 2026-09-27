import {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import type { Problem } from '../types';

const API_BASE =
  'http://localhost:5001/api';

export const useProblem = (
  slug?: string
) => {
  const [problem, setProblem] =
    useState<Problem | null>(null);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    // Sandbox không fetch problem
    if (!slug || slug === 'sandbox') {
      setProblem(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProblem = async () => {
      try {
        setLoading(true);

        const token =
          localStorage.getItem('token');

        const response =
          await axios.get(
            `${API_BASE}/problems/${slug}`,
            {
              headers: token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {},
            }
          );

        if (cancelled) {
          return;
        }

        setProblem(
          response.data?.data ||
            response.data
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Lỗi tải bài tập:',
          error
        );

        setProblem(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProblem();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return {
    problem,
    loading,
  };
};