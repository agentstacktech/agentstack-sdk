/**
 * SDKProjectSelector - Универсальный селектор проектов на уровне SDK
 * 
 * Поддержка режимов: "Все проекты", "Мои проекты", "Конкретный проект", "Просмотр данных пользователя"
 * Интеграция с SDK через sdk.api.getProjects()
 * Glassmorphism дизайн
 * Мобильная адаптация
 */

import React, { useState, useMemo } from 'react';
import { useProjectSelector, ProjectSelectorMode } from '../hooks/useProjectSelector';

export interface SDKProjectSelectorProps {
  currentProjectId?: number | null;
  mode?: ProjectSelectorMode;
  onProjectChange: (projectId: number | null, mode: ProjectSelectorMode) => void;
  compact?: boolean;
  showAllOption?: boolean;
  userId?: number; // Для режима view_user_data
  className?: string;
  renderModal?: (props: {
    isOpen: boolean;
    onClose: () => void;
    projects: any[];
    selectedProjectId: number | null;
    onSelect: (projectId: number | null) => void;
    selectedMode: ProjectSelectorMode;
    onModeChange: (mode: ProjectSelectorMode) => void;
  }) => React.ReactNode;
}

export function SDKProjectSelector({
  currentProjectId,
  mode: initialMode = 'specific',
  onProjectChange,
  compact = false,
  showAllOption = true,
  userId,
  className = '',
  renderModal,
}: SDKProjectSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<ProjectSelectorMode>(initialMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    projects,
    currentProject,
    isLoading,
    error,
    setProject,
    setMode,
    selectedProjectId,
  } = useProjectSelector({
    initialProjectId: currentProjectId || null,
    initialMode: selectedMode,
  });

  const handleProjectSelect = (projectId: number | null) => {
    setProject(projectId);
    onProjectChange(projectId, selectedMode);
    setIsModalOpen(false);
  };

  const handleModeChange = (newMode: ProjectSelectorMode) => {
    setSelectedMode(newMode);
    setMode(newMode);
    // При смене режима на "all" сбрасываем выбранный проект
    if (newMode === 'all') {
      handleProjectSelect(null);
    }
  };

  const openProjectSelectorModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Если передан renderModal, используем его для рендеринга модального окна
  const modalContent = renderModal ? renderModal({
    isOpen: isModalOpen,
    onClose: closeModal,
    projects,
    selectedProjectId,
    onSelect: handleProjectSelect,
    selectedMode,
    onModeChange: handleModeChange,
  }) : null;

  if (compact) {
    return (
      <>
        <button
          onClick={openProjectSelectorModal}
          className={`px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors ${className}`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <span className="text-xs text-gray-500">▼</span>
          </div>
        </button>
        {modalContent}
      </>
    );
  }

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <button
          onClick={openProjectSelectorModal}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Project
              </div>
              <div className="text-lg font-semibold mt-1">
                {currentProject ? currentProject.name : 'No project selected'}
              </div>
            </div>
            <span className="text-gray-400">▼</span>
          </div>
        </button>
      </div>
      {modalContent}
    </>
  );
}

