import { useState, useEffect } from 'react';
import type { Note, Tag } from '@/lib/db';
import { getTagById } from '@/lib/db';

type NoteProps = {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
};

export function NoteComponent({
  note,
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleArchive,
}: NoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      if (note.tagIds && note.tagIds.length > 0) {
        const tagPromises = note.tagIds.map(id => getTagById(id));
        const tagResults = await Promise.all(tagPromises);
        const validTags = tagResults.filter((tag): tag is Tag => tag !== undefined);
        setTags(validTags);
      } else {
        setTags([]);
      }
    };
    fetchTags();
  }, [note.tagIds]);

  const handleSave = () => {
    onUpdate(note.id, { title, content });
    setIsEditing(false);
  };

  return (
    <div 
      className={`p-4 rounded-lg shadow-md mb-4 ${
        note.color ? `bg-${note.color}-100` : 'bg-white'
      }`}
    >
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Title"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border rounded min-h-[100px]"
            placeholder="Take a note..."
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-lg mb-2">{note.title}</h3>
            <div className="flex space-x-1">
              <button
                onClick={() => onTogglePin(note.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title={note.isPinned ? 'Unpin' : 'Pin to top'}
              >
                📌
              </button>
              <button
                onClick={() => onToggleArchive(note.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title={note.isArchived ? 'Unarchive' : 'Archive'}
              >
                {note.isArchived ? '📂' : '📁'}
              </button>
              <button
                onClick={() => {
                  setTitle(note.title);
                  setContent(note.content);
                  setIsEditing(true);
                }}
                className="p-1 hover:bg-gray-100 rounded"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="p-1 hover:bg-gray-100 rounded text-red-500"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
          {tags && tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag: Tag) => (
                <span
                  key={tag.id}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-gray-500">
            {new Date(note.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
