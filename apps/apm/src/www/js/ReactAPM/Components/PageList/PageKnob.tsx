import React, { useEffect, useRef, useState } from 'react';

interface PageKnobProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
}

export default function PageKnob({ value, onChange, min = 1, max = 9999 }: PageKnobProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const valueRef = useRef(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return;
        setIsDragging(true);
        const startY = e.clientY;
        const startVal = valueRef.current;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const sensitivity = 4;
            const delta = Math.floor((startY - moveEvent.clientY) / sensitivity);
            const newVal = Math.max(min, Math.min(max, startVal + delta));
            if (newVal !== valueRef.current) onChange(newVal);
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isEditing) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        onChange(Math.max(min, Math.min(max, value + delta)));
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging) return;
        e.preventDefault();
        setEditValue(String(value));
        setIsEditing(true);
        setTimeout(() => {
            inputRef.current?.select();
        }, 0);
    };

    const commitEdit = () => {
        const n = parseInt(editValue, 10);
        if (!Number.isNaN(n)) {
            onChange(Math.max(min, Math.min(max, n)));
        }
        setIsEditing(false);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') setIsEditing(false);
    };

    return (
        <div
            className="knob-mini"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onClick={handleClick}
            style={{
                userSelect: 'none',
                touchAction: 'none',
                width: '36px',
                height: '36px',
                border: isDragging ? '1.5px solid #007bff' : isEditing ? '1.5px solid #28a745' : '1.5px solid #333',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isEditing ? 'default' : 'ns-resize',
                background: '#f8f9fa',
                overflow: 'hidden',
            }}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleEditKeyDown}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#28a745',
                        outline: 'none',
                        padding: 0,
                    }}
                />
            ) : (
                <span style={{ fontSize: '11px', color: isDragging ? '#007bff' : '#333', fontWeight: 600, lineHeight: 1 }}>
                    {value}
                </span>
            )}
        </div>
    );
}
