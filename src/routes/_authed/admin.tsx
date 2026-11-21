import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ClipboardListIcon, HouseIcon, LayoutDashboardIcon, ListChecksIcon } from 'lucide-react'
import { BrandLogo } from '#/components/brand-logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { currentUserQuery } from '#/lib/session'

/** Espace administration (#11 : barre latérale). Confort de navigation : chaque fonction serveur revérifie le rôle. */
export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery)
    if (user?.membership?.role !== 'admin') throw redirect({ to: '/app' })
  },
  component: AdminLayout,
})

const ADMIN_LINKS = [
  { to: '/admin', label: 'Vue d’ensemble', icon: LayoutDashboardIcon },
  { to: '/admin/menus', label: 'Menus', icon: ClipboardListIcon },
  { to: '/admin/services', label: 'Commandes du jour', icon: ListChecksIcon },
] as const

function AdminLayout() {
  const { data: user } = useSuspenseQuery(currentUserQuery)
  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="p-4">
          <Link to="/admin" className="flex items-center gap-3">
            <BrandLogo className="h-11" />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Restauration</span>
              <span className="text-xs text-muted-foreground">Administration</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Gestion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_LINKS.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild>
                      <Link to={to} activeOptions={{ exact: true, includeSearch: false }} activeProps={{ 'data-active': true }}>
                        <Icon />
                        {label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/app">
                  <HouseIcon />
                  Espace repas
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <p className="truncate px-2 text-xs text-muted-foreground">{user?.membership?.canteenName}</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger aria-label="Ouvrir le menu d’administration" />
          <span className="text-sm font-medium text-muted-foreground">Administration</span>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
