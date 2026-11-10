import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieBanner from '../components/CookieBanner';
import SocialIcon, { SOCIAL_IDS, SOCIAL_META } from '../components/SocialIcon';
import EditPostModal from '../components/EditPostModal';
import type { Post } from '../store/types';

const samplePost: Post = {
  id: 'p1',
  title: 'Original title',
  content: '<p>Hello world</p>',
  topic: 'testing',
  type: 'post',
  status: 'queued',
  createdAt: '2026-10-01T10:00:00.000Z',
  socialNetworks: ['vk'],
  hasAudio: false,
  hasVideo: false,
  hasImage: false,
  views: 0,
  likes: 0,
};

beforeEach(() => {
  localStorage.clear();
});

describe('CookieBanner', () => {
  it('shows the banner when cookies are not accepted yet', () => {
    render(<CookieBanner language="en" />);
    expect(screen.getByText(/We use cookies/i)).toBeInTheDocument();
  });

  it('hides the banner when already accepted', () => {
    localStorage.setItem('blogpost_cookies_accepted', 'true');
    const { container } = render(<CookieBanner language="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Russian text when language is ru', () => {
    render(<CookieBanner language="ru" />);
    expect(screen.getByText(/Мы используем файлы cookie/i)).toBeInTheDocument();
  });

  it('persists the choice and hides on Accept', () => {
    render(<CookieBanner language="en" />);
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(localStorage.getItem('blogpost_cookies_accepted')).toBe('true');
    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument();
  });

  it('also hides on Decline', () => {
    render(<CookieBanner language="en" />);
    fireEvent.click(screen.getByRole('button', { name: /Decline/i }));
    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument();
  });
});

describe('SocialIcon', () => {
  it('renders an svg for every known network', () => {
    for (const id of SOCIAL_IDS) {
      const { container, unmount } = render(<SocialIcon id={id} />);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });

  it('falls back gracefully for unknown ids', () => {
    const { container } = render(<SocialIcon id="unknown-network" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('applies custom size', () => {
    const { container } = render(<SocialIcon id="vk" size={48} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('48');
    expect(svg?.getAttribute('height')).toBe('48');
  });

  it('exposes brand metadata for all networks', () => {
    for (const id of SOCIAL_IDS) {
      expect(SOCIAL_META[id].name).toBeTruthy();
      expect(SOCIAL_META[id].color).toMatch(/^#/);
    }
  });
});

describe('EditPostModal', () => {
  it('renders form with initial post values', () => {
    render(<EditPostModal post={samplePost} language="en" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Original title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testing')).toBeInTheDocument();
  });

  it('calls onSave with edited fields and closes', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<EditPostModal post={samplePost} language="en" onSave={onSave} onClose={onClose} />);

    fireEvent.change(screen.getByDisplayValue('Original title'), { target: { value: 'New title' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [id, updates] = onSave.mock.calls[0];
    expect(id).toBe('p1');
    expect(updates.title).toBe('New title');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose without saving on cancel', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<EditPostModal post={samplePost} language="en" onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Russian labels when language is ru', () => {
    render(<EditPostModal post={samplePost} language="ru" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Заголовок')).toBeInTheDocument();
    expect(screen.getByText('Тема')).toBeInTheDocument();
  });
});
