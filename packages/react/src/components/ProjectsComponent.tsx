/**
 * ProjectsComponent - Example React component using AgentStack SDK
 * Demonstrates how to use useProjects hook
 */

import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import type { Project } from '@agentstack/sdk';

export function ProjectsComponent() {
  const {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectStats,
    isLoading,
    error,
  } = useProjects();

  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    project_type: 'web',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const result = await getProjects();
      setProjects(result.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      const newProject = await createProject(createForm);
      setProjects(prev => [...prev, newProject]);
      setCreateForm({ name: '', description: '', project_type: 'web' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      const updatedProject = await updateProject(editingProject.id, editForm);
      setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p));
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      name: project.name,
      description: project.description || '',
      is_active: project.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Create Project
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter project description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Type</label>
              <select
                value={createForm.project_type}
                onChange={(e) => setCreateForm(prev => ({ ...prev, project_type: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="web">Web Application</option>
                <option value="mobile">Mobile Application</option>
                <option value="api">API Service</option>
                <option value="desktop">Desktop Application</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateProject}
                className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              >
                Create Project
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Form */}
      {editingProject && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Project</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleUpdateProject}
                className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              >
                Update Project
              </button>
              <button
                onClick={() => setEditingProject(null)}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{project.name}</h3>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  project.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {project.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              {project.description || 'No description'}
            </p>
            
            <div className="text-xs text-gray-500 mb-4">
              <div>Type: {project.project_type}</div>
              <div>Created: {new Date(project.created_at).toLocaleDateString()}</div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditProject(project)}
                className="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteProject(project.id)}
                className="bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No projects found. Create your first project!</p>
        </div>
      )}
    </div>
  );
}
