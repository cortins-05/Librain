"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  FileText,
  Globe,
  ImageIcon,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Texinquietud } from "@/components/ui/textarea";

type ResourceType = "url" | "file" | "text";

const RESOURCE_META: Record<
  ResourceType,
  {
    label: string;
    hint: string;
    icon: ComponentType<{ className?: string }>;
    placeholder: string;
  }
> = {
  url: {
    label: "URL",
    hint: "Perfecto para articulos, noticias o referencias web.",
    icon: Globe,
    placeholder: "https://...",
  },
  file: {
    label: "Archivo",
    hint: "Soporta PDF, imagenes, audio y video.",
    icon: Upload,
    placeholder: "",
  },
  text: {
    label: "Texto",
    hint: "Pega apuntes, ideas o contenido libre para analizar.",
    icon: Type,
    placeholder: "Pega aqui tu texto...",
  },
};

export default function MainComponentAddTask() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [resource, setResource] = useState<ResourceType | null>(null);
  const [value, setValue] = useState("");
  const [fileValue, setFileValue] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasInputValue = resource === "file" ? Boolean(fileValue) : value.trim().length > 0;
  const canSubmit = Boolean(resource && hasInputValue);
  const selectedResource = resource ? RESOURCE_META[resource] : null;

  async function saveTask() {
    const trimmedDescription = description.trim();
    const trimmedValue = value.trim();

    if (!resource) return;
    if (resource === "file" && !fileValue) return;
    if (resource !== "file" && !trimmedValue) return;

    setLoading(true);

    try {
      const response =
        resource === "file"
          ? await fetch("/api/task", {
              method: "POST",
              body: (() => {
                const formData = new FormData();
                formData.append("resource", "file");
                formData.append("description", trimmedDescription);
                formData.append("value", fileValue?.name ?? "");
                if (fileValue) {
                  formData.append("file", fileValue);
                }
                return formData;
              })(),
            })
          : await fetch("/api/task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resource,
                value: trimmedValue,
                description: trimmedDescription,
              }),
            });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            stored?: { _id?: string };
            ai?: { fallback?: boolean; error?: string | null };
          }
        | null;

      if (!response.ok) {
        const errorMessage = payload?.error ?? "No se pudo guardar la inquietud";
        console.error("Error al guardar:", errorMessage);
        toast(errorMessage);
        return;
      }

      if (payload?.ai?.fallback) {
        toast(
          payload.ai.error
            ? `Guardado con fallback de IA: ${payload.ai.error}`
            : "Guardado con fallback de IA"
        );
      } else {
        toast("Guardado con exito");
      }

      setValue("");
      setFileValue(null);
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.push("/");
    } catch {
      toast("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 shadow-sm duration-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              1
            </span>
            Selecciona el tipo de recurso
          </CardTitle>
          <CardDescription>
            Elige como quieres crear la inquietud: URL, archivo o texto libre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            onValueChange={(selected) => {
              setResource(selected as ResourceType);
              setValue("");
              setFileValue(null);
              setDescription("");
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-65">
              <SelectValue placeholder="Selecciona un recurso" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="file">Archivo</SelectItem>
                <SelectItem value="text">Texto</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <Globe className="size-3.5" />
              URL
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <FileText className="size-3.5" />
              PDF
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <ImageIcon className="size-3.5" />
              Imagen
            </Badge>
          </div>
        </CardContent>
      </Card>

      {resource && selectedResource ? (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 shadow-sm duration-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                2
              </span>
              Configura el contenido
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <selectedResource.icon className="size-4" />
              {selectedResource.hint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resource === "url" ? (
              <Input
                placeholder={selectedResource.placeholder}
                onChange={(event) => setValue(event.target.value)}
                value={value}
                type="text"
              />
            ) : null}

            {resource === "text" ? (
              <Texinquietud
                onChange={(event) => setValue(event.target.value)}
                value={value}
                placeholder={selectedResource.placeholder}
                className="min-h-36"
              />
            ) : null}

            {resource === "file" ? (
              <div className="space-y-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*,video/*,application/pdf"
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] ?? null;
                    setFileValue(selectedFile);
                    setValue(selectedFile?.name ?? "");
                  }}
                />
                {fileValue ? (
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                    Archivo seleccionado:{" "}
                    <span className="font-medium text-foreground">{fileValue.name}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {hasInputValue ? (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 shadow-sm duration-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                3
              </span>
              Escribe una descripcion corta
            </CardTitle>
            <CardDescription>
              Esta descripcion ayuda a la IA a entender el contexto de lo que quieres
              priorizar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Texinquietud
              onChange={(event) => setDescription(event.target.value)}
              value={description}
              className="min-h-32"
              placeholder="Ejemplo: Quiero extraer los puntos clave y definir la accion siguiente."
            />
          </CardContent>
        </Card>
      ) : null}

      {resource ? (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/70 bg-card/80 shadow-sm duration-500">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Listo para guardar</p>
              <p className="text-sm text-muted-foreground">
                Completa los pasos y guarda para generar metadata con IA.
              </p>
            </div>

            <Button
              onClick={saveTask}
              className="w-full sm:w-auto"
              size="lg"
              disabled={loading || !canSubmit}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Guardando...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="size-4" />
                  Guardar inquietud
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
