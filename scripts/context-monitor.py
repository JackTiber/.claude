#!/usr/bin/env python3
"""
Claude Code Context Monitor
Real-time context usage monitoring with visual indicators and session analytics
"""

import json
import sys
import os
import re

def parse_context_from_transcript(transcript_path):
    """Parse context usage from transcript file."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    
    try:
        with open(transcript_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        
        # Check last 15 lines for context information
        recent_lines = lines[-15:] if len(lines) > 15 else lines
        
        for line in reversed(recent_lines):
            try:
                data = json.loads(line.strip())
                
                # Method 1: Parse usage tokens from assistant messages
                if data.get('type') == 'assistant':
                    message = data.get('message', {})
                    usage = message.get('usage', {})
                    
                    if usage:
                        input_tokens = usage.get('input_tokens', 0)
                        cache_read = usage.get('cache_read_input_tokens', 0)
                        cache_creation = usage.get('cache_creation_input_tokens', 0)
                        
                        # Estimate context usage (assume 200k context for Claude Sonnet)
                        total_tokens = input_tokens + cache_read + cache_creation
                        if total_tokens > 0:
                            percent_used = min(100, (total_tokens / 200000) * 100)
                            return {
                                'percent': percent_used,
                                'tokens': total_tokens,
                                'method': 'usage'
                            }
                
                # Method 2: Parse system context warnings
                elif data.get('type') == 'system_message':
                    content = data.get('content', '')
                    
                    # "Context left until auto-compact: X%"
                    match = re.search(r'Context left until auto-compact: (\d+)%', content)
                    if match:
                        percent_left = int(match.group(1))
                        return {
                            'percent': 100 - percent_left,
                            'warning': 'auto-compact',
                            'method': 'system'
                        }
                    
                    # "Context low (X% remaining)"
                    match = re.search(r'Context low \((\d+)% remaining\)', content)
                    if match:
                        percent_left = int(match.group(1))
                        return {
                            'percent': 100 - percent_left,
                            'warning': 'low',
                            'method': 'system'
                        }
            
            except (json.JSONDecodeError, KeyError, ValueError):
                continue
        
        return None
        
    except (FileNotFoundError, PermissionError):
        return None

def get_context_display(context_info, model_context_limit=200000):
    """Generate context display with visual indicators."""
    if not context_info:
        return ""

    percent = context_info.get('percent', 0)
    tokens = context_info.get('tokens', 0)
    warning = context_info.get('warning')

    # Color based on usage level
    if percent >= 95:
        color = "\033[31;1m"  # Blinking red
        alert = "CRIT"
    elif percent >= 90:
        color = "\033[31m"    # Red
        alert = "HIGH"
    elif percent >= 75:
        color = "\033[91m"   # Light red
        alert = ""
    elif percent >= 50:
        color = "\033[33m"   # Yellow
        alert = ""
    else:
        color = "\033[96m"   # Light blue
        alert = ""

    # Create progress bar with 10 segments (with gaps between them)
    segments = 10
    tokens_per_segment = model_context_limit / segments
    filled = min(segments, int(tokens / tokens_per_segment) + (1 if tokens % tokens_per_segment > 0 else 0))

    # Build bar with bubbles (filled vs unfilled)
    bar_segments = ["◉" if i < filled else "○" for i in range(segments)]
    bar = " ".join(bar_segments)

    # Special warnings
    if warning == 'auto-compact':
        alert = "AUTO-COMPACT!"
    elif warning == 'low':
        alert = "LOW!"

    reset = "\033[0m"
    alert_str = f" {alert}" if alert else ""

    # Format token counts (e.g., 50k/200k)
    def format_tokens(t):
        if t >= 1000:
            return f"{t//1000}k"
        return str(t)

    tokens_display = f"{format_tokens(tokens)}/{format_tokens(model_context_limit)}"

    return f"{color}{bar}{reset}  {tokens_display}{alert_str}"

def get_directory_display(workspace_data):
    """Get directory display name."""
    current_dir = workspace_data.get('current_dir', '')
    project_dir = workspace_data.get('project_dir', '')
    
    if current_dir and project_dir:
        if current_dir.startswith(project_dir):
            rel_path = current_dir[len(project_dir):].lstrip('/')
            return rel_path or os.path.basename(project_dir)
        else:
            return os.path.basename(current_dir)
    elif project_dir:
        return os.path.basename(project_dir)
    elif current_dir:
        return os.path.basename(current_dir)
    else:
        return "unknown"

def get_session_metrics(cost_data):
    """Get session metrics display."""
    if not cost_data:
        return ""
    
    metrics = []
    
    # Cost
    cost_usd = cost_data.get('total_cost_usd', 0)
    if cost_usd > 0:
        if cost_usd >= 5.00:
            cost_color = "\033[31m"  # Red for expensive
        elif cost_usd >= 1.00:
            cost_color = "\033[33m"  # Yellow for moderate
        else:
            cost_color = "\033[32m"  # Green for cheap
        
        cost_str = f"{cost_usd*100:.0f}¢" if cost_usd < 0.01 else f"${cost_usd:.3f}"
        metrics.append(f"{cost_color}{cost_str}\033[0m")
    
    # Duration
    duration_ms = cost_data.get('total_duration_ms', 0)
    if duration_ms > 0:
        minutes = duration_ms / 60000
        if minutes >= 30:
            duration_color = "\033[33m"  # Yellow for long sessions
        else:
            duration_color = "\033[90m"  # Dark gray

        if minutes < 1:
            duration_str = f"{duration_ms//1000}s"
        else:
            duration_str = f"{minutes:.0f}m"

        metrics.append(f"{duration_color}{duration_str}\033[0m")
    
    # Lines changed
    lines_added = cost_data.get('total_lines_added', 0)
    lines_removed = cost_data.get('total_lines_removed', 0)
    if lines_added > 0 or lines_removed > 0:
        net_lines = lines_added - lines_removed
        
        if net_lines > 0:
            lines_color = "\033[32m"  # Green for additions
        elif net_lines < 0:
            lines_color = "\033[31m"  # Red for deletions
        else:
            lines_color = "\033[33m"  # Yellow for neutral
        
        sign = "+" if net_lines >= 0 else ""
        metrics.append(f"{lines_color}{sign}{net_lines}\033[0m")

    # Join metrics with dividers
    divider = "\033[90m│\033[0m"
    return f" {divider} {f' {divider} '.join(metrics)}" if metrics else ""

def main():
    try:
        # Read JSON input from Claude Code
        data = json.load(sys.stdin)
        
        # Extract information
        model_name = data.get('model', {}).get('display_name', 'Claude')
        workspace = data.get('workspace', {})
        transcript_path = data.get('transcript_path', '')
        cost_data = data.get('cost', {})
        
        # Parse context usage
        context_info = parse_context_from_transcript(transcript_path)
        
        # Build status components
        context_display = get_context_display(context_info)
        directory = get_directory_display(workspace)
        session_metrics = get_session_metrics(cost_data)

        # Model display with static light blue color
        model_display = f"\033[96m[{model_name}]\033[0m"

        # Divider
        divider = "\033[90m│\033[0m"

        # Combine all components (skip context if empty)
        components = [model_display, divider, f"\033[93m📁 {directory}\033[0m"]
        if context_display:
            components.append(f"{divider} {context_display}")
        if session_metrics:
            # session_metrics already has a leading divider
            components.append(session_metrics)

        status_line = " ".join(components)

        print(status_line)
        
    except Exception as e:
        # Fallback display on any error
        print(f"\033[94m[Claude]\033[0m \033[93m📁 {os.path.basename(os.getcwd())}\033[0m \033[31m[Error: {str(e)[:20]}]\033[0m")

if __name__ == "__main__":
    main()