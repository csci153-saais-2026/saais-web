import { EllipsisIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RowActionsMenuProps {
  readonly label: string
  readonly onEdit: () => void
  readonly onDelete: () => void
  readonly editDisabled?: boolean
  readonly deleteDisabled?: boolean
}

export function RowActionsMenu({
  label,
  onEdit,
  onDelete,
  editDisabled,
  deleteDisabled,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${label}`}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={editDisabled} onSelect={onEdit}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={deleteDisabled}
          onSelect={onDelete}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
