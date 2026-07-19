
ALTER TABLE public.vendors DISABLE TRIGGER USER;
UPDATE public.vendors
SET verification_status = 'approved'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sgmthethwa@vertexlabz.co.za');
ALTER TABLE public.vendors ENABLE TRIGGER USER;
