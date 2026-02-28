import LogoutButton from './Auth/LogoutButton';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function AppSidebar() {

  const session = await auth.api.getSession({headers: await headers()});

  console.log(session?.user)

  return (
    <Sidebar>
      <SidebarHeader>
        <Avatar>
          <AvatarImage src={session?.user.image ?? ""} />
          <AvatarFallback>{session?.user.name}</AvatarFallback>
        </Avatar>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  )
}