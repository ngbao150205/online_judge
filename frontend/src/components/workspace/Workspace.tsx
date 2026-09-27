import {
  useParams,
} from 'react-router-dom';

import {
  useProblem,
} from './hooks/useProblem';

import {
  ProblemWorkspace,
} from './problem/ProblemWorkspace';

import {
  SandboxWorkspace,
} from './sandbox/SandboxWorkspace';

const WorkspaceLoading = () => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-8 w-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto" />

        <p className="mt-3 text-sm text-gray-500">
          Đang tải bài tập...
        </p>
      </div>
    </div>
  );
};

const WorkspaceNotFound =
  () => {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Không tìm thấy bài tập
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Bài tập không tồn tại hoặc đã bị xóa.
          </p>
        </div>
      </div>
    );
  };

const Workspace: React.FC = () => {
  const {
    slug,
  } =
    useParams<{
      slug: string;
    }>();

  const isSandbox =
    !slug ||
    slug === 'sandbox';

  /**
   * Sandbox không fetch problem.
   */
  const {
    problem,
    loading,
  } = useProblem(
    isSandbox
      ? undefined
      : slug
  );

  if (isSandbox) {
    return (
      <SandboxWorkspace />
    );
  }

  if (loading) {
    return (
      <WorkspaceLoading />
    );
  }

  if (!problem) {
    return (
      <WorkspaceNotFound />
    );
  }

  return (
    <ProblemWorkspace
      problem={problem}
    />
  );
};

export default Workspace;